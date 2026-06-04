import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────────
//
// The repositories and the Redis-backed refresh store are replaced with stateful
// in-memory fakes, so the SERVICE logic (hashing, rotation, reuse detection,
// enumeration-safe errors) runs for real against real bcrypt and real JWTs —
// only Postgres and Redis are stubbed.

vi.mock("../repositories/auth.repository", () => {
  interface FakeUser {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    role: string;
    phone: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }

  const usersById = new Map<string, FakeUser>();
  const idByEmail = new Map<string, string>();
  const stylistProfiles = new Map<string, unknown>();
  let seq = 0;

  return {
    __store: { usersById, idByEmail, stylistProfiles },
    isUniqueConstraintError: (err: unknown) =>
      Boolean(err && typeof err === "object" && "__unique" in err),
    authRepository: {
      findByEmail: vi.fn(async (email: string) => {
        const id = idByEmail.get(email);
        const u = id ? usersById.get(id) : undefined;
        return u && !u.deletedAt ? { ...u } : null;
      }),
      findActiveById: vi.fn(async (id: string) => {
        const u = usersById.get(id);
        return u && !u.deletedAt ? { ...u } : null;
      }),
      createUser: vi.fn(
        async (
          data: {
            email: string;
            passwordHash: string;
            name: string;
            role: string;
            phone?: string;
          },
          stylistProfile?: unknown,
        ) => {
          if (idByEmail.has(data.email)) {
            throw Object.assign(new Error("unique violation"), { __unique: true });
          }
          const now = new Date();
          const user: FakeUser = {
            id: `user_${++seq}`,
            email: data.email,
            passwordHash: data.passwordHash,
            name: data.name,
            role: data.role,
            phone: data.phone ?? null,
            avatarUrl: null,
            isVerified: false,
            lastLoginAt: null,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          };
          usersById.set(user.id, user);
          idByEmail.set(user.email, user.id);
          if (stylistProfile) stylistProfiles.set(user.id, stylistProfile);
          return { ...user };
        },
      ),
      updateLastLogin: vi.fn(async (id: string) => {
        const u = usersById.get(id);
        if (u) u.lastLoginAt = new Date();
      }),
      // resolveAuthUser() embeds a stylist's approval status; the fake has no
      // Stylist table, so report null (resolveAuthUser tolerates it). Without
      // this stub, registering/logging in as a stylist throws "not a function".
      getStylistStatusByUserId: vi.fn(async () => null),
    },
  };
});

vi.mock("../repositories/refreshTokenStore", () => {
  const owner = new Map<string, string>(); // jti -> userId
  const userJtis = new Map<string, Set<string>>(); // userId -> {jti}

  return {
    refreshTokenStore: {
      save: vi.fn(async (jti: string, userId: string) => {
        owner.set(jti, userId);
        const set = userJtis.get(userId) ?? new Set<string>();
        set.add(jti);
        userJtis.set(userId, set);
      }),
      getUserId: vi.fn(async (jti: string) => owner.get(jti) ?? null),
      revoke: vi.fn(async (userId: string, jti: string) => {
        owner.delete(jti);
        userJtis.get(userId)?.delete(jti);
      }),
      revokeAllForUser: vi.fn(async (userId: string) => {
        for (const jti of userJtis.get(userId) ?? []) owner.delete(jti);
        userJtis.delete(userId);
      }),
    },
  };
});

vi.mock("../repositories/audit.repository", () => ({
  auditRepository: { record: vi.fn(async () => {}) },
}));

// Imported AFTER the mocks are declared (vi.mock is hoisted regardless).
import { authService } from "./auth.service";
import { authRepository } from "../repositories/auth.repository";
import * as authRepoModule from "../repositories/auth.repository";
import { refreshTokenStore } from "../repositories/refreshTokenStore";
import { ERROR_CODES } from "@glamly/shared";

// Reach into the fake's internal maps (exposed only by the mock) to reset
// between tests. The real module has no `__store`, hence the deliberate cast.
const repoStore = (
  authRepoModule as unknown as {
    __store: {
      usersById: Map<string, unknown>;
      idByEmail: Map<string, unknown>;
      stylistProfiles: Map<string, unknown>;
    };
  }
).__store;

const userRegistration = {
  role: "user" as const,
  name: "Ada Lovelace",
  email: "ada@example.com",
  password: "Sup3rSecret",
};

const stylistRegistration = {
  role: "stylist" as const,
  name: "Zara Stylist",
  email: "zara@example.com",
  password: "Sup3rSecret",
  phone: "+2348012345678",
  specialty: "Bridal Makeup",
  location: "Lagos",
  priceFrom: 15000,
};

beforeEach(() => {
  repoStore.usersById.clear();
  repoStore.idByEmail.clear();
  repoStore.stylistProfiles.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("authService.register", () => {
  it("hashes the password, persists the user, and issues a session", async () => {
    const session = await authService.register(userRegistration);

    expect(session.user.email).toBe("ada@example.com");
    expect(session.user.role).toBe("user");
    expect(session.accessToken).toEqual(expect.any(String));
    expect(session.refreshToken).toEqual(expect.any(String));
    expect(session.accessExpiresIn).toBeGreaterThan(0);

    // Password must be hashed, never stored or returned in plaintext.
    const created = authRepository.createUser as ReturnType<typeof vi.fn>;
    const storedHash = created.mock.calls[0]![0].passwordHash as string;
    expect(storedHash).not.toBe(userRegistration.password);
    expect(storedHash).toMatch(/^\$2[aby]\$/); // bcrypt signature
    expect(JSON.stringify(session.user)).not.toContain("passwordHash");
  });

  it("creates a stylist storefront profile for stylist registrations", async () => {
    await authService.register(stylistRegistration);
    const created = authRepository.createUser as ReturnType<typeof vi.fn>;
    // Second positional arg is the stylist profile.
    expect(created.mock.calls[0]![1]).toMatchObject({
      specialty: "Bridal Makeup",
      location: "Lagos",
      priceFrom: 15000,
    });
  });

  it("rejects a duplicate email with AUTH_EMAIL_TAKEN", async () => {
    await authService.register(userRegistration);
    await expect(authService.register(userRegistration)).rejects.toMatchObject({
      code: ERROR_CODES.AUTH_EMAIL_TAKEN,
      statusCode: 409,
    });
  });
});

describe("authService.login", () => {
  it("succeeds with the correct password and records last login", async () => {
    await authService.register(userRegistration);
    const session = await authService.login({
      email: userRegistration.email,
      password: userRegistration.password,
    });

    expect(session.user.email).toBe("ada@example.com");
    expect(session.accessToken).toEqual(expect.any(String));
    expect(authRepository.updateLastLogin).toHaveBeenCalledTimes(1);
  });

  it("rejects a wrong password with the generic AUTH_INVALID_CREDENTIALS", async () => {
    await authService.register(userRegistration);
    await expect(
      authService.login({ email: userRegistration.email, password: "WrongPass1" }),
    ).rejects.toMatchObject({
      code: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      message: "Invalid credentials",
      statusCode: 401,
    });
  });

  it("rejects an unknown email with the SAME generic error (no enumeration)", async () => {
    await expect(
      authService.login({ email: "ghost@example.com", password: "Whatever1" }),
    ).rejects.toMatchObject({ code: ERROR_CODES.AUTH_INVALID_CREDENTIALS });
  });
});

describe("authService.refresh", () => {
  it("rotates the refresh token and keeps the chain valid", async () => {
    const first = await authService.register(userRegistration);

    const second = await authService.refresh(first.refreshToken);
    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(second.accessToken).toEqual(expect.any(String));

    // The newly minted token continues the chain.
    const third = await authService.refresh(second.refreshToken);
    expect(third.refreshToken).not.toBe(second.refreshToken);
  });

  it("detects reuse of an already-rotated token and revokes everything", async () => {
    const first = await authService.register(userRegistration);
    await authService.refresh(first.refreshToken); // rotates first away

    // Replaying the retired token is treated as theft.
    await expect(authService.refresh(first.refreshToken)).rejects.toMatchObject({
      code: ERROR_CODES.AUTH_SESSION_EXPIRED,
    });
    expect(refreshTokenStore.revokeAllForUser).toHaveBeenCalledTimes(1);
  });

  it("rejects a missing refresh token", async () => {
    await expect(authService.refresh(undefined)).rejects.toMatchObject({
      code: ERROR_CODES.AUTH_SESSION_EXPIRED,
    });
  });

  it("rejects a structurally invalid refresh token", async () => {
    await expect(authService.refresh("not.a.jwt")).rejects.toMatchObject({
      code: ERROR_CODES.AUTH_SESSION_EXPIRED,
    });
  });
});

describe("authService.logout", () => {
  it("revokes the session so the refresh token can no longer be used", async () => {
    const session = await authService.register(userRegistration);

    await authService.logout(session.refreshToken);
    expect(refreshTokenStore.revoke).toHaveBeenCalledTimes(1);

    await expect(authService.refresh(session.refreshToken)).rejects.toMatchObject({
      code: ERROR_CODES.AUTH_SESSION_EXPIRED,
    });
  });

  it("is a no-op (never throws) when no token is supplied", async () => {
    await expect(authService.logout(undefined)).resolves.toBeUndefined();
    expect(refreshTokenStore.revoke).not.toHaveBeenCalled();
  });
});
