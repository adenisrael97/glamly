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

  interface FakeReset {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    usedAt: Date | null;
    createdAt: Date;
  }

  const usersById = new Map<string, FakeUser>();
  const idByEmail = new Map<string, string>();
  const stylistProfiles = new Map<string, unknown>();
  const resetsById = new Map<string, FakeReset>();
  const resetsByHash = new Map<string, string>(); // tokenHash -> reset id
  let seq = 0;

  return {
    __store: { usersById, idByEmail, stylistProfiles, resetsById, resetsByHash },
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

      // ── Password reset (stateful in-memory fakes) ──────────────────────────
      savePasswordResetToken: vi.fn(
        async (userId: string, tokenHash: string, expiresAt: Date) => {
          // Mirror the real repo: one active token per user — drop any prior.
          for (const [id, r] of resetsById) {
            if (r.userId === userId) {
              resetsById.delete(id);
              resetsByHash.delete(r.tokenHash);
            }
          }
          const rec: FakeReset = {
            id: `reset_${++seq}`,
            userId,
            tokenHash,
            expiresAt,
            usedAt: null,
            createdAt: new Date(),
          };
          resetsById.set(rec.id, rec);
          resetsByHash.set(tokenHash, rec.id);
          return { ...rec };
        },
      ),
      findPasswordResetByTokenHash: vi.fn(async (tokenHash: string) => {
        const id = resetsByHash.get(tokenHash);
        const r = id ? resetsById.get(id) : undefined;
        return r ? { ...r } : null;
      }),
      consumeResetAndUpdatePassword: vi.fn(
        async (resetId: string, userId: string, passwordHash: string) => {
          const r = resetsById.get(resetId);
          // Conditional single-use guard — mirrors the real updateMany(usedAt: null).
          if (!r || r.usedAt) return false;
          r.usedAt = new Date();
          const u = usersById.get(userId);
          if (u) u.passwordHash = passwordHash;
          return true;
        },
      ),
      updatePasswordHash: vi.fn(async (userId: string, passwordHash: string) => {
        const u = usersById.get(userId);
        if (u) u.passwordHash = passwordHash;
      }),
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
      revokeAllForUserExcept: vi.fn(async (userId: string, keepJti: string | undefined) => {
        const set = userJtis.get(userId);
        if (!set) return;
        for (const jti of [...set]) {
          if (jti === keepJti) continue;
          owner.delete(jti);
          set.delete(jti);
        }
      }),
    },
  };
});

vi.mock("../repositories/audit.repository", () => ({
  auditRepository: { record: vi.fn(async () => {}) },
}));

// Imported AFTER the mocks are declared (vi.mock is hoisted regardless).
import { createHash } from "node:crypto";
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
      resetsById: Map<string, unknown>;
      resetsByHash: Map<string, unknown>;
    };
  }
).__store;

const sha256 = (raw: string): string => createHash("sha256").update(raw).digest("hex");

/** Seed a reset token straight into the fake store and return the raw token. */
async function seedResetToken(
  userId: string,
  { raw = "raw-reset-token", expiresAt = new Date(Date.now() + 60 * 60 * 1000) } = {},
): Promise<string> {
  await authRepository.savePasswordResetToken(userId, sha256(raw), expiresAt);
  return raw;
}

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
  repoStore.resetsById.clear();
  repoStore.resetsByHash.clear();
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

describe("authService.forgotPassword", () => {
  it("issues a hashed reset token for a registered email", async () => {
    const { user } = await authService.register(userRegistration);

    await authService.forgotPassword({ email: userRegistration.email });

    const save = authRepository.savePasswordResetToken as ReturnType<typeof vi.fn>;
    expect(save).toHaveBeenCalledTimes(1);
    const [userId, tokenHash, expiresAt] = save.mock.calls[0]!;
    expect(userId).toBe(user.id);
    // A SHA-256 hex digest is stored — never the raw token.
    expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect((expiresAt as Date).getTime()).toBeGreaterThan(Date.now());
  });

  it("silently no-ops for an unknown email (no enumeration, no token)", async () => {
    await expect(
      authService.forgotPassword({ email: "ghost@example.com" }),
    ).resolves.toBeUndefined();
    expect(authRepository.savePasswordResetToken).not.toHaveBeenCalled();
  });
});

describe("authService.validateResetToken", () => {
  it("returns a masked email for a valid token", async () => {
    const { user } = await authService.register(userRegistration);
    const token = await seedResetToken(user.id);

    const { maskedEmail } = await authService.validateResetToken(token);
    // ada@example.com -> a***@example.com
    expect(maskedEmail).toBe("a***@example.com");
  });

  it("rejects an unknown token as INVALID", async () => {
    await expect(authService.validateResetToken("nope")).rejects.toMatchObject({
      code: ERROR_CODES.AUTH_RESET_TOKEN_INVALID,
      statusCode: 400,
    });
  });

  it("rejects an expired token as EXPIRED", async () => {
    const { user } = await authService.register(userRegistration);
    const token = await seedResetToken(user.id, { expiresAt: new Date(Date.now() - 1000) });

    await expect(authService.validateResetToken(token)).rejects.toMatchObject({
      code: ERROR_CODES.AUTH_RESET_TOKEN_EXPIRED,
    });
  });
});

describe("authService.resetPassword", () => {
  const newPassword = "Br4ndNewPass";

  it("sets the new password, revokes sessions, and rejects the old one", async () => {
    const { user } = await authService.register(userRegistration);
    const token = await seedResetToken(user.id);

    await authService.resetPassword({
      token,
      password: newPassword,
      confirmPassword: newPassword,
    });

    // All live sessions are revoked after a reset (stolen-cookie defence).
    expect(refreshTokenStore.revokeAllForUser).toHaveBeenCalledWith(user.id);

    // New password works; the old one no longer does.
    await expect(
      authService.login({ email: userRegistration.email, password: newPassword }),
    ).resolves.toMatchObject({ user: { email: userRegistration.email } });
    await expect(
      authService.login({ email: userRegistration.email, password: userRegistration.password }),
    ).rejects.toMatchObject({ code: ERROR_CODES.AUTH_INVALID_CREDENTIALS });
  });

  it("rejects a replay of the same (now-used) token", async () => {
    const { user } = await authService.register(userRegistration);
    const token = await seedResetToken(user.id);

    await authService.resetPassword({
      token,
      password: newPassword,
      confirmPassword: newPassword,
    });
    // The token is single-use — replaying it fails as INVALID.
    await expect(
      authService.resetPassword({
        token,
        password: "An0therPass",
        confirmPassword: "An0therPass",
      }),
    ).rejects.toMatchObject({ code: ERROR_CODES.AUTH_RESET_TOKEN_INVALID });
  });

  it("rejects an expired token without changing the password", async () => {
    const { user } = await authService.register(userRegistration);
    const token = await seedResetToken(user.id, { expiresAt: new Date(Date.now() - 1000) });

    await expect(
      authService.resetPassword({
        token,
        password: newPassword,
        confirmPassword: newPassword,
      }),
    ).rejects.toMatchObject({ code: ERROR_CODES.AUTH_RESET_TOKEN_EXPIRED });

    // Original password still valid — the expired attempt was a no-op.
    await expect(
      authService.login({ email: userRegistration.email, password: userRegistration.password }),
    ).resolves.toMatchObject({ user: { email: userRegistration.email } });
  });
});

describe("authService.changePassword", () => {
  const newPassword = "Ch4ngedPass";

  it("changes the password after verifying the current one (old fails, new works)", async () => {
    const session = await authService.register(userRegistration);

    await authService.changePassword(
      session.user.id,
      {
        currentPassword: userRegistration.password,
        newPassword,
        confirmPassword: newPassword,
      },
      { currentRefreshToken: session.refreshToken },
    );

    await expect(
      authService.login({ email: userRegistration.email, password: newPassword }),
    ).resolves.toMatchObject({ user: { email: userRegistration.email } });
    await expect(
      authService.login({ email: userRegistration.email, password: userRegistration.password }),
    ).rejects.toMatchObject({ code: ERROR_CODES.AUTH_INVALID_CREDENTIALS });
  });

  it("rejects a wrong current password with AUTH_INCORRECT_PASSWORD (400, not 401)", async () => {
    const session = await authService.register(userRegistration);

    await expect(
      authService.changePassword(session.user.id, {
        currentPassword: "WrongCurrent1",
        newPassword,
        confirmPassword: newPassword,
      }),
    ).rejects.toMatchObject({
      code: ERROR_CODES.AUTH_INCORRECT_PASSWORD,
      statusCode: 400,
    });

    // Password unchanged — original still works.
    await expect(
      authService.login({ email: userRegistration.email, password: userRegistration.password }),
    ).resolves.toMatchObject({ user: { email: userRegistration.email } });
  });

  it("keeps the current session but revokes the user's other sessions", async () => {
    const first = await authService.register(userRegistration); // device A
    const second = await authService.login({
      email: userRegistration.email,
      password: userRegistration.password,
    }); // device B

    await authService.changePassword(
      first.user.id,
      {
        currentPassword: userRegistration.password,
        newPassword,
        confirmPassword: newPassword,
      },
      { currentRefreshToken: first.refreshToken },
    );

    // Device A (the one that changed the password) stays signed in.
    await expect(authService.refresh(first.refreshToken)).resolves.toMatchObject({
      accessToken: expect.any(String),
    });
    // Device B is logged out.
    await expect(authService.refresh(second.refreshToken)).rejects.toMatchObject({
      code: ERROR_CODES.AUTH_SESSION_EXPIRED,
    });
  });
});
