import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Axios mock ────────────────────────────────────────────────────────────────
// `vi.mock` is hoisted above all imports, so any variable it references must
// also be hoisted via `vi.hoisted`. The mockAxiosPost handle is shared between
// the factory (which runs at hoist time) and the test bodies.

const { mockAxiosPost } = vi.hoisted(() => ({ mockAxiosPost: vi.fn() }));

vi.mock("axios", () => {
  const instance = {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };

  const axiosDefault = Object.assign(vi.fn(() => instance), {
    create: vi.fn(() => instance),
    post: mockAxiosPost,
    isAxiosError: () => false,
  });

  return {
    default: axiosDefault,
    isAxiosError: () => false,
  };
});

// ─────────────────────────────────────────────────────────────────────────────
import {
  setAccessToken,
  getAccessToken,
  setAuthEvents,
  refreshSession,
  ApiError,
} from "@/lib/api";

beforeEach(() => {
  setAccessToken(null);
  setAuthEvents({});
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Token management ──────────────────────────────────────────────────────────

describe("setAccessToken / getAccessToken", () => {
  it("stores and retrieves the access token", () => {
    setAccessToken("tok_abc");
    expect(getAccessToken()).toBe("tok_abc");
  });

  it("clears the token when called with null", () => {
    setAccessToken("tok_abc");
    setAccessToken(null);
    expect(getAccessToken()).toBeNull();
  });

  it("starts as null (no persisted token)", () => {
    expect(getAccessToken()).toBeNull();
  });
});

// ── setAuthEvents ─────────────────────────────────────────────────────────────

describe("setAuthEvents", () => {
  it("calls onTokenRefreshed when a refresh succeeds", async () => {
    const onRefreshed = vi.fn();
    setAuthEvents({ onTokenRefreshed: onRefreshed });

    mockAxiosPost.mockResolvedValueOnce({
      data: { data: { accessToken: "new_tok", expiresIn: 900, user: { id: "u1" } } },
    });

    await refreshSession();
    expect(onRefreshed).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: "new_tok" }),
    );
  });

  it("does not call onTokenRefreshed when a refresh fails", async () => {
    const onRefreshed = vi.fn();
    setAuthEvents({ onTokenRefreshed: onRefreshed });

    mockAxiosPost.mockRejectedValueOnce(new Error("Unauthorized"));

    await refreshSession();
    expect(onRefreshed).not.toHaveBeenCalled();
  });

  it("accepts new callbacks without throwing", () => {
    const cb = vi.fn();
    expect(() => setAuthEvents({ onSessionExpired: cb })).not.toThrow();
    expect(() => setAuthEvents({})).not.toThrow();
  });
});

// ── refreshSession ─────────────────────────────────────────────────────────────

describe("refreshSession", () => {
  it("returns the refreshed AuthResult when refresh succeeds", async () => {
    mockAxiosPost.mockResolvedValueOnce({
      data: { data: { accessToken: "fresh_tok", expiresIn: 900, user: { id: "u1" } } },
    });

    const result = await refreshSession();
    expect(result?.accessToken).toBe("fresh_tok");
    expect(getAccessToken()).toBe("fresh_tok");
  });

  it("returns null and clears the token when refresh fails", async () => {
    setAccessToken("stale_tok");
    mockAxiosPost.mockRejectedValueOnce(new Error("401 Unauthorized"));

    const result = await refreshSession();
    expect(result).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it("collapses concurrent calls to a single in-flight request", async () => {
    let resolveOnce!: (v: unknown) => void;
    const pending = new Promise((r) => {
      resolveOnce = r;
    });
    mockAxiosPost.mockReturnValueOnce(pending);

    const [a, b, c] = [refreshSession(), refreshSession(), refreshSession()];
    resolveOnce({ data: { data: { accessToken: "single", expiresIn: 900, user: {} } } });

    const results = await Promise.all([a, b, c]);

    // All three got the same result from a single axios call.
    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r?.accessToken === "single")).toBe(true);
  });
});

// ── ApiError ──────────────────────────────────────────────────────────────────

describe("ApiError", () => {
  it("is an instance of Error with name ApiError", () => {
    const err = new ApiError("Something failed", "AUTH_UNAUTHORIZED", 401);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ApiError");
  });

  it("exposes code and status fields", () => {
    const err = new ApiError("Not found", "NOT_FOUND", 404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.status).toBe(404);
    expect(err.message).toBe("Not found");
  });

  it("can be caught as a standard Error", () => {
    const err = new ApiError("Forbidden", "AUTH_FORBIDDEN", 403);
    expect(() => { throw err; }).toThrow("Forbidden");
  });
});
