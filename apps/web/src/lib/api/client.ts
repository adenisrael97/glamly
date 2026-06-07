import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import type { ApiResponse, AuthResult, ErrorCode } from "@glamly/shared";
import { ERROR_CODES } from "@glamly/shared";

// The single HTTP contract between web and api (CLAUDE.md §2/§4). Every data
// access in the app goes through this configured Axios instance — components
// never call `fetch` directly.
//
// Auth model (CLAUDE.md §6): the short-lived access token lives ONLY in memory
// (here), so an XSS can't lift it from localStorage. The long-lived refresh
// token is an httpOnly cookie the browser sends to `/auth/*` automatically
// (`withCredentials`). On a 401 the response interceptor silently refreshes the
// access token (single-flight) and replays the original request once.

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

// ─── Typed API error ──────────────────────────────────────────────────────────

/** Normalised error thrown by every api/* call. Clients branch on `code`. */
export class ApiError extends Error {
  readonly code: ErrorCode | string;
  readonly status: number;

  constructor(message: string, code: ErrorCode | string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

interface ErrorBody {
  error?: { message?: string; code?: string };
  message?: string;
}

function toApiError(error: AxiosError): ApiError {
  const status = error.response?.status ?? 0;
  const body = error.response?.data as ErrorBody | undefined;
  const code = body?.error?.code ?? (status === 0 ? "NETWORK_ERROR" : ERROR_CODES.INTERNAL_ERROR);
  const message =
    body?.error?.message ??
    body?.message ??
    (status === 0 ? "Unable to reach the server. Check your connection." : error.message);
  return new ApiError(message, code, status);
}

// ─── In-memory access token ─────────────────────────────────────────────────────

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// ─── Auth event bridge ──────────────────────────────────────────────────────────
//
// AuthContext registers here so it can mirror the in-memory token into its React
// state when the interceptor refreshes silently, and react when the session
// finally expires. Decoupled so the client has no React dependency.

interface AuthEvents {
  onTokenRefreshed?: (result: AuthResult) => void;
  onSessionExpired?: () => void;
}

let authEvents: AuthEvents = {};

export function setAuthEvents(events: AuthEvents): void {
  authEvents = events;
}

// ─── The instance ───────────────────────────────────────────────────────────────

export const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // send/receive the httpOnly refresh cookie
  headers: { "Content-Type": "application/json" },
});

client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Endpoints that must never trigger a refresh-retry (they ARE the auth flow, so
// a 401 from them is terminal — refreshing would recurse or mask bad creds).
function isAuthFlow(url?: string): boolean {
  if (!url) return false;
  return (
    url.includes("/auth/refresh") ||
    url.includes("/auth/login") ||
    url.includes("/auth/register") ||
    url.includes("/auth/logout")
  );
}

// ─── Single-flight refresh ──────────────────────────────────────────────────────
//
// A burst of requests that all 401 at once must share ONE refresh call, not fire
// N of them (which would rotate the refresh token N times and revoke itself).

let refreshInFlight: Promise<AuthResult | null> | null = null;

async function performRefresh(): Promise<AuthResult | null> {
  // Bare axios (not `client`) so this call bypasses the interceptors below.
  try {
    const res = await axios.post<ApiResponse<AuthResult>>(
      `${API_BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true, timeout: 5000 },
    );
    const result = res.data.data;
    accessToken = result.accessToken;
    authEvents.onTokenRefreshed?.(result);
    return result;
  } catch {
    accessToken = null;
    return null;
  }
}

export function refreshSession(): Promise<AuthResult | null> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

client.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    if (status === 401 && original && !original._retry && !isAuthFlow(original.url)) {
      original._retry = true;
      const refreshed = await refreshSession();
      if (refreshed) {
        original.headers.Authorization = `Bearer ${refreshed.accessToken}`;
        return client(original);
      }
      // Refresh failed — the session is gone for good.
      authEvents.onSessionExpired?.();
    }

    return Promise.reject(toApiError(error));
  },
);

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Unwrap the `{ success, data }` envelope to the payload. */
export async function unwrap<T>(promise: Promise<AxiosResponse<ApiResponse<T>>>): Promise<T> {
  const res = await promise;
  return res.data.data;
}
