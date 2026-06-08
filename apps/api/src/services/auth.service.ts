import { randomUUID, randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { User } from "@prisma/client";
import {
  apiRoleToDbRole,
  dbRoleToApiRole,
  ROLES,
  type AuthUser,
  type ChangePasswordInput,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
  type Role,
  type StylistApprovalStatus,
  type UpdateProfileInput,
} from "@glamly/shared";
import {
  authRepository,
  isUniqueConstraintError,
} from "../repositories/auth.repository";
import { auditRepository } from "../repositories/audit.repository";
import {
  cloudinary,
  UploadFailedError,
  UploadNotConfiguredError,
} from "../integrations/cloudinary";
import { refreshTokenStore } from "../repositories/refreshTokenStore";
import {
  EmailTakenError,
  IncorrectPasswordError,
  InvalidCredentialsError,
  ResetTokenExpiredError,
  ResetTokenInvalidError,
  SessionExpiredError,
} from "../errors/AppError";
import {
  accessTokenTtlSeconds,
  refreshTokenTtlSeconds,
  signAccessToken,
  signRefreshToken,
  TokenError,
  verifyRefreshToken,
} from "../lib/jwt";
import { config } from "../config";
import { logger } from "../lib/logger";
import { notificationsService } from "./notifications.service";

// bcrypt cost: CLAUDE.md §6 mandates ≥ 12. Higher = slower brute force at the
// cost of login latency; 12 is the current sweet spot for this hardware class.
const BCRYPT_COST = 12;

// A precomputed hash compared against when no user is found, so a login for a
// non-existent email takes the same time as one for a real email. Without this,
// response timing leaks which emails are registered (user enumeration).
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("a-non-matching-placeholder", BCRYPT_COST);

/** Tokens minted for a session, plus the metadata the controller needs. */
export interface IssuedSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  /** Access-token lifetime in seconds (for the client to schedule refresh). */
  accessExpiresIn: number;
  /** Refresh-token lifetime in seconds (for the cookie max-age). */
  refreshExpiresIn: number;
}

/** Per-request context for audit trails. Never carries PII. */
export interface AuthContext {
  ipAddress?: string;
}

export const authService = {
  async register(input: RegisterInput, ctx: AuthContext = {}): Promise<IssuedSession> {
    // Enumeration tradeoff (documented): registration must reject a duplicate
    // email to be usable, so this path — unlike login — does reveal that an
    // address is taken. The generic AUTH_EMAIL_TAKEN code carries no further
    // detail. A fully enumeration-proof flow (always-202 + verification email)
    // is deferred until the Resend integration lands.
    const existing = await authRepository.findByEmail(input.email);
    if (existing) throw new EmailTakenError();

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
    const role = apiRoleToDbRole(input.role);

    let user: User;
    try {
      user = await authRepository.createUser(
        {
          email: input.email,
          passwordHash,
          name: input.name,
          role,
          phone: input.phone,
        },
        input.role === "stylist"
          ? {
              specialty: input.specialty,
              location: input.location,
              priceFrom: input.priceFrom,
            }
          : undefined,
      );
    } catch (err) {
      // Two concurrent registrations for the same email race past the read
      // check above; the unique constraint is the real guard.
      if (isUniqueConstraintError(err)) throw new EmailTakenError();
      throw err;
    }

    await auditRepository.record({
      userId: user.id,
      action: "USER_REGISTERED",
      entityType: "User",
      entityId: user.id,
      metadata: { role },
      ipAddress: ctx.ipAddress,
    });

    // Best-effort welcome email, fired after the account is persisted. Not awaited
    // so a slow/down email provider never delays or fails registration; the
    // service swallows its own errors (§11: side effects after commit).
    void notificationsService.sendWelcome({
      name: user.name,
      email: user.email,
      isStylist: input.role === "stylist",
    });

    return issueSession(user);
  },

  async login(input: LoginInput, ctx: AuthContext = {}): Promise<IssuedSession> {
    const user = await authRepository.findByEmail(input.email);

    // Always run a bcrypt compare — against the real hash if the user exists,
    // against the dummy hash otherwise — so both branches cost the same time.
    const passwordMatches = await bcrypt.compare(
      input.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches) {
      await auditRepository.record({
        userId: user?.id ?? null,
        action: "LOGIN_FAILED",
        ipAddress: ctx.ipAddress,
      });
      // One error for "no such user" and "wrong password" alike.
      throw new InvalidCredentialsError();
    }

    await authRepository.updateLastLogin(user.id);
    await auditRepository.record({
      userId: user.id,
      action: "LOGIN_SUCCEEDED",
      ipAddress: ctx.ipAddress,
    });

    return issueSession(user);
  },

  /**
   * Validate a refresh token, rotate it (old one is revoked, a new one minted),
   * and return a fresh session. Implements reuse detection: a correctly-signed
   * token whose id is absent from the whitelist was already rotated away —
   * treat it as a stolen/replayed token and nuke every session for that user.
   */
  async refresh(
    refreshToken: string | undefined,
    ctx: AuthContext = {},
  ): Promise<IssuedSession> {
    if (!refreshToken) throw new SessionExpiredError();

    let payload: { sub: string; jti: string };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (err) {
      if (err instanceof TokenError) throw new SessionExpiredError();
      throw err;
    }

    const ownerId = await refreshTokenStore.getUserId(payload.jti);

    // Signed correctly but not in the whitelist → already rotated or revoked.
    // Defensive response: revoke the whole family in case the token was stolen.
    if (!ownerId || ownerId !== payload.sub) {
      await refreshTokenStore.revokeAllForUser(payload.sub);
      await auditRepository.record({
        userId: payload.sub,
        action: "REFRESH_TOKEN_REUSE_DETECTED",
        ipAddress: ctx.ipAddress,
      });
      logger.warn("Refresh token reuse detected — all sessions revoked", {
        userId: payload.sub,
      });
      throw new SessionExpiredError();
    }

    // Rotate: retire the presented token before issuing its replacement.
    await refreshTokenStore.revoke(payload.sub, payload.jti);

    const user = await authRepository.findActiveById(payload.sub);
    if (!user) {
      // Account deleted/deactivated between issue and refresh — fail closed.
      await refreshTokenStore.revokeAllForUser(payload.sub);
      throw new SessionExpiredError();
    }

    await auditRepository.record({
      userId: user.id,
      action: "TOKEN_REFRESHED",
      ipAddress: ctx.ipAddress,
    });

    return issueSession(user);
  },

  /**
   * Revoke the presented refresh token. Idempotent and never throws on a
   * missing/invalid token — logging out is always "successful" from the
   * client's perspective and the cookie is cleared regardless.
   */
  async logout(refreshToken: string | undefined, ctx: AuthContext = {}): Promise<void> {
    if (!refreshToken) return;
    try {
      const payload = verifyRefreshToken(refreshToken);
      await refreshTokenStore.revoke(payload.sub, payload.jti);
      await auditRepository.record({
        userId: payload.sub,
        action: "USER_LOGOUT",
        ipAddress: ctx.ipAddress,
      });
    } catch (err) {
      // A malformed/expired token on logout is a no-op, not an error.
      if (!(err instanceof TokenError)) throw err;
    }
  },

  /** Resolve the authenticated user's public profile (access-token protected). */
  async getProfile(userId: string): Promise<AuthUser> {
    const user = await authRepository.findActiveById(userId);
    // The access token verified, but the account vanished (deleted) — treat as
    // session gone rather than a 404 leak.
    if (!user) throw new SessionExpiredError();
    return resolveAuthUser(user);
  },

  /**
   * Upload and persist a new avatar for the authenticated user.
   * Accepts a raw buffer from the multer memory-storage middleware.
   * The old avatar is deleted from Cloudinary as a best-effort side-effect.
   */
  async uploadAvatar(
    userId: string,
    buffer: Buffer,
    ctx: AuthContext = {},
  ): Promise<AuthUser> {
    if (!cloudinary.isConfigured()) throw new UploadNotConfiguredError();

    // Fetch current avatar URL so the integration can delete the old asset.
    const current = await authRepository.findActiveById(userId);
    const result = await cloudinary.upload(buffer, "avatar", current?.avatarUrl);

    if (result.status === "not_configured") throw new UploadNotConfiguredError();
    if (result.status === "failed") throw new UploadFailedError(result.error);

    const user = await authRepository.updateAvatar(userId, result.url);

    await auditRepository.record({
      userId,
      action: "AVATAR_UPDATED",
      entityType: "User",
      entityId: userId,
      ipAddress: ctx.ipAddress,
    });

    return resolveAuthUser(user);
  },

  /**
   * Patch the authenticated user's own profile (name/phone/address). Returns the
   * fresh public projection so the client can update its state in place.
   */
  async updateProfile(
    userId: string,
    input: UpdateProfileInput,
    ctx: AuthContext = {},
  ): Promise<AuthUser> {
    const user = await authRepository.updateProfile(userId, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
    });

    await auditRepository.record({
      userId,
      action: "PROFILE_UPDATED",
      entityType: "User",
      entityId: userId,
      // Field NAMES only — never the PII values themselves (§10).
      metadata: { fields: Object.keys(input) },
      ipAddress: ctx.ipAddress,
    });

    return resolveAuthUser(user);
  },

  /**
   * Initiate a password reset. Generates a cryptographically secure token,
   * stores its SHA-256 hash, and fires a reset email.
   *
   * ALWAYS responds successfully, even when the email is not registered.
   * This prevents user enumeration: an attacker cannot determine which addresses
   * have accounts by checking whether the request succeeded or failed.
   *
   * The raw token (not the hash) travels in the email link. If the database is
   * compromised, the stored hashes are useless without the raw tokens.
   */
  async forgotPassword(input: ForgotPasswordInput, ctx: AuthContext = {}): Promise<void> {
    const user = await authRepository.findByEmail(input.email);

    if (!user) {
      // Log at debug level only — no PII in the message, just that we no-oped.
      logger.debug("Forgot-password request for unknown email — silently ignored");
      return;
    }

    // 32 random bytes → 64-char hex string. Sufficient entropy for a one-time
    // token that expires in 1 hour and is stored as a SHA-256 hash.
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await authRepository.savePasswordResetToken(user.id, tokenHash, expiresAt);

    await auditRepository.record({
      userId: user.id,
      action: "PASSWORD_RESET_REQUESTED",
      entityType: "User",
      entityId: user.id,
      ipAddress: ctx.ipAddress,
    });

    const resetUrl = `${config.WEB_APP_URL}/reset-password?token=${rawToken}`;

    // Best-effort; a failed email never breaks the caller (§11).
    void notificationsService.sendPasswordReset({
      name: user.name,
      email: user.email,
      resetUrl,
    });
  },

  /**
   * Validate a reset token without consuming it (GET before showing the form).
   * Returns the masked email so the UI can display "resetting password for ****@example.com".
   * Throws if the token is invalid or expired.
   */
  async validateResetToken(rawToken: string): Promise<{ maskedEmail: string }> {
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const record = await authRepository.findPasswordResetByTokenHash(tokenHash);

    if (!record || record.usedAt) throw new ResetTokenInvalidError();
    if (record.expiresAt < new Date()) throw new ResetTokenExpiredError();

    const user = await authRepository.findActiveById(record.userId);
    if (!user) throw new ResetTokenInvalidError();

    // Mask the email: show first char + *** + @domain (e.g. a***@example.com).
    const [local, domain] = user.email.split("@") as [string, string];
    const maskedEmail = `${local[0]}***@${domain}`;
    return { maskedEmail };
  },

  /**
   * Consume a reset token and update the user's password.
   *
   * On success:
   *   1. Token is marked used + password hash updated, ATOMICALLY in one DB
   *      transaction — single-use, and a partial failure can't leave the token
   *      consumed with an unchanged password (§11).
   *   2. ALL active sessions are revoked (a stolen cookie after a reset is
   *      useless). This is an external side effect, so it runs AFTER the
   *      transaction commits.
   *   3. Audit event recorded.
   */
  async resetPassword(
    input: ResetPasswordInput,
    ctx: AuthContext = {},
  ): Promise<void> {
    const tokenHash = createHash("sha256").update(input.token).digest("hex");
    const record = await authRepository.findPasswordResetByTokenHash(tokenHash);

    if (!record || record.usedAt) throw new ResetTokenInvalidError();
    if (record.expiresAt < new Date()) throw new ResetTokenExpiredError();

    const user = await authRepository.findActiveById(record.userId);
    if (!user) throw new ResetTokenInvalidError();

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

    // Atomic consume-and-update. Returns false if a concurrent request already
    // consumed this token between our read above and this write — treat the loser
    // as an invalid (already-used) token.
    const consumed = await authRepository.consumeResetAndUpdatePassword(
      record.id,
      record.userId,
      passwordHash,
    );
    if (!consumed) throw new ResetTokenInvalidError();

    // Revoke all live sessions so a stolen cookie is useless post-reset. After
    // the commit: an external (Redis) side effect never runs inside the txn (§11).
    await refreshTokenStore.revokeAllForUser(record.userId);

    await auditRepository.record({
      userId: record.userId,
      action: "PASSWORD_RESET_COMPLETED",
      entityType: "User",
      entityId: record.userId,
      ipAddress: ctx.ipAddress,
    });

    logger.info("Password reset completed", { userId: record.userId });
  },

  /**
   * Change the password of an already-authenticated user. The current password is
   * verified first (proof of presence). On success every OTHER session is revoked
   * so a stolen cookie on another device is killed, while the device making the
   * change stays signed in (identified by `currentRefreshToken`). The JWT-based
   * access tokens remain valid until they expire (~15m); the session whitelist is
   * the revocation point.
   */
  async changePassword(
    userId: string,
    input: ChangePasswordInput,
    ctx: AuthContext & { currentRefreshToken?: string } = {},
  ): Promise<void> {
    const user = await authRepository.findActiveById(userId);
    if (!user) throw new SessionExpiredError();

    const matches = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!matches) {
      await auditRepository.record({
        userId,
        action: "PASSWORD_CHANGE_FAILED",
        entityType: "User",
        entityId: userId,
        ipAddress: ctx.ipAddress,
      });
      throw new IncorrectPasswordError();
    }

    const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_COST);
    await authRepository.updatePasswordHash(userId, passwordHash);

    // Keep the current device signed in; log every other session out. A
    // missing/invalid current token degrades to revoking all (fail safe).
    let keepJti: string | undefined;
    if (ctx.currentRefreshToken) {
      try {
        keepJti = verifyRefreshToken(ctx.currentRefreshToken).jti;
      } catch (err) {
        if (!(err instanceof TokenError)) throw err;
      }
    }
    await refreshTokenStore.revokeAllForUserExcept(userId, keepJti);

    await auditRepository.record({
      userId,
      action: "PASSWORD_CHANGED",
      entityType: "User",
      entityId: userId,
      ipAddress: ctx.ipAddress,
    });

    logger.info("Password changed", { userId });
  },
};

// ─── Internal helpers ──────────────────────────────────────────────────────────

async function issueSession(user: User): Promise<IssuedSession> {
  const role = user.role as Role;
  const jti = randomUUID();

  const accessToken = signAccessToken({ sub: user.id, role });
  const refreshToken = signRefreshToken({ sub: user.id, jti });

  // Whitelist the refresh token AFTER both are signed; if signing throws we
  // never leave an orphan Redis entry.
  await refreshTokenStore.save(jti, user.id, refreshTokenTtlSeconds);

  return {
    user: await resolveAuthUser(user),
    accessToken,
    refreshToken,
    accessExpiresIn: accessTokenTtlSeconds,
    refreshExpiresIn: refreshTokenTtlSeconds,
  };
}

/**
 * Build the public AuthUser, additionally embedding `stylistStatus` for STYLIST
 * accounts so the client can gate the studio (pending/suspended) up front.
 */
async function resolveAuthUser(user: User): Promise<AuthUser> {
  if (user.role === ROLES.STYLIST) {
    const status = await authRepository.getStylistStatusByUserId(user.id);
    return toAuthUser(user, (status as StylistApprovalStatus | null) ?? null);
  }
  return toAuthUser(user);
}

/** Project a DB user to the safe, public shape — never exposes passwordHash. */
function toAuthUser(user: User, stylistStatus?: StylistApprovalStatus | null): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: dbRoleToApiRole(user.role as Role),
    avatarUrl: user.avatarUrl ?? null,
    phone: user.phone ?? null,
    address: user.address ?? null,
    isVerified: user.isVerified,
    createdAt: user.createdAt.toISOString(),
    ...(stylistStatus !== undefined ? { stylistStatus } : {}),
  };
}
