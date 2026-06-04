"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type {
  AuthResult,
  AuthUser,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from "@glamly/shared";
import {
  ApiError,
  authApi,
  refreshSession,
  setAccessToken,
  setAuthEvents,
} from "@/lib/api";

// Real auth backed by the API (replaces the localStorage simulation). The access
// token lives in memory inside the API client; we mirror it into React state so
// realtime/push consumers re-render when it changes. The refresh token is an
// httpOnly cookie the browser manages — never touched here.
//
// `glamly_role` is a small NON-httpOnly hint cookie set on login/logout purely so
// `middleware.ts` can do optimistic route guarding (it cannot read the httpOnly
// refresh cookie). It is NOT a security boundary — the API is the real enforcer.

const ROLE_COOKIE = "glamly_role";
// Match the refresh-cookie lifetime so the hint expires roughly when the session does.
const ROLE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function setRoleCookie(role: AuthUser["role"]): void {
  if (typeof document === "undefined") return;
  document.cookie = `${ROLE_COOKIE}=${role}; path=/; max-age=${ROLE_COOKIE_MAX_AGE}; samesite=lax`;
}

function clearRoleCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/** True when the hint cookie suggests a session worth attempting to restore. */
function hasRoleHint(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c.startsWith(`${ROLE_COOKIE}=`) && c.length > ROLE_COOKIE.length + 1);
}

// ─── State ──────────────────────────────────────────────────────────────────────

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface State {
  user: AuthUser | null;
  accessToken: string | null;
  status: AuthStatus;
  error: string | null;
}

type Action =
  | { type: "SESSION"; user: AuthUser; accessToken: string }
  | { type: "UPDATE_USER"; user: AuthUser }
  | { type: "UNAUTHENTICATED" }
  | { type: "ERROR"; error: string | null }
  | { type: "CLEAR_ERROR" };

const initialState: State = {
  user: null,
  accessToken: null,
  status: "loading",
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SESSION":
      return {
        user: action.user,
        accessToken: action.accessToken,
        status: "authenticated",
        error: null,
      };
    case "UPDATE_USER":
      return { ...state, user: action.user };
    case "UNAUTHENTICATED":
      return { ...state, user: null, accessToken: null, status: "unauthenticated" };
    case "ERROR":
      return { ...state, error: action.error };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    default:
      return state;
  }
}

// ─── Context shape ────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  status: AuthStatus;
  /** True until the initial session restore resolves (back-compat with callers). */
  loading: boolean;
  error: string | null;
  login: (creds: LoginInput) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  updateProfile: (input: UpdateProfileInput) => Promise<AuthUser>;
  /** Upload a new avatar for the authenticated user and update React state. */
  uploadAvatar: (file: File) => Promise<AuthUser>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function messageFor(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const applySession = useCallback((result: AuthResult) => {
    setAccessToken(result.accessToken);
    setRoleCookie(result.user.role);
    dispatch({ type: "SESSION", user: result.user, accessToken: result.accessToken });
  }, []);

  // Bridge the API client's silent-refresh / session-expiry events into state,
  // then attempt to restore an existing session from the refresh cookie.
  useEffect(() => {
    setAuthEvents({
      onTokenRefreshed: (result) => applySession(result),
      onSessionExpired: () => {
        clearRoleCookie();
        dispatch({ type: "UNAUTHENTICATED" });
      },
    });

    let active = true;
    // Only probe the refresh endpoint when a hint cookie suggests an existing
    // session — a logged-out visitor shouldn't trigger a 401 on every page load.
    if (hasRoleHint()) {
      refreshSession().then((result) => {
        if (!active) return;
        if (result) applySession(result);
        else {
          clearRoleCookie();
          dispatch({ type: "UNAUTHENTICATED" });
        }
      });
    } else {
      dispatch({ type: "UNAUTHENTICATED" });
    }

    return () => {
      active = false;
      setAuthEvents({});
    };
  }, [applySession]);

  const login = useCallback(
    async (creds: LoginInput) => {
      dispatch({ type: "CLEAR_ERROR" });
      try {
        const result = await authApi.login(creds);
        applySession(result);
        return result.user;
      } catch (err) {
        dispatch({ type: "ERROR", error: messageFor(err) });
        throw err;
      }
    },
    [applySession],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      dispatch({ type: "CLEAR_ERROR" });
      try {
        const result = await authApi.register(input);
        applySession(result);
        return result.user;
      } catch (err) {
        dispatch({ type: "ERROR", error: messageFor(err) });
        throw err;
      }
    },
    [applySession],
  );

  const updateProfile = useCallback(async (input: UpdateProfileInput) => {
    dispatch({ type: "CLEAR_ERROR" });
    try {
      const updated = await authApi.updateProfile(input);
      dispatch({ type: "UPDATE_USER", user: updated });
      return updated;
    } catch (err) {
      dispatch({ type: "ERROR", error: messageFor(err) });
      throw err;
    }
  }, []);

  const uploadAvatar = useCallback(async (file: File) => {
    dispatch({ type: "CLEAR_ERROR" });
    try {
      const updated = await authApi.uploadAvatar(file);
      dispatch({ type: "UPDATE_USER", user: updated });
      return updated;
    } catch (err) {
      dispatch({ type: "ERROR", error: messageFor(err) });
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      clearRoleCookie();
      dispatch({ type: "UNAUTHENTICATED" });
    }
  }, []);

  const clearError = useCallback(() => dispatch({ type: "CLEAR_ERROR" }), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: state.user,
      accessToken: state.accessToken,
      status: state.status,
      loading: state.status === "loading",
      error: state.error,
      login,
      register,
      updateProfile,
      uploadAvatar,
      logout,
      clearError,
    }),
    [state, login, register, updateProfile, uploadAvatar, logout, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
