import { Prisma, User, PasswordReset } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type { Role } from "@glamly/shared";

// The ONLY place Prisma is touched for authentication. Services orchestrate;
// this layer just reads and writes rows.

export interface CreateUserData {
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  phone?: string;
}

export interface CreateStylistProfileData {
  specialty: string;
  location: string;
  priceFrom: number;
}

export const authRepository = {
  /**
   * Active (non-soft-deleted) user by email, including the password hash for the
   * login compare. Email is stored normalised (lower-cased) by the service.
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({ where: { email, deletedAt: null } });
  },

  /** Active user by id — used by the access-token-protected profile route. */
  async findActiveById(id: string): Promise<User | null> {
    return prisma.user.findFirst({ where: { id, deletedAt: null } });
  },

  /**
   * Create a user and, for stylists, their storefront profile atomically.
   * Both rows must land together or not at all (§11), so they share one
   * transaction. The DB unique constraint on `email` is the race-safe guard
   * against duplicate registration; a P2002 surfaces to the service.
   */
  async createUser(
    data: CreateUserData,
    stylistProfile?: CreateStylistProfileData,
  ): Promise<User> {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash: data.passwordHash,
          name: data.name,
          role: data.role,
          phone: data.phone,
        },
      });

      if (stylistProfile) {
        await tx.stylist.create({
          data: {
            userId: user.id,
            specialty: stylistProfile.specialty,
            location: stylistProfile.location,
            priceFrom: stylistProfile.priceFrom,
          },
        });
      }

      return user;
    });
  },

  async updateLastLogin(id: string): Promise<void> {
    await prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
  },

  /** Patch a user's own editable profile fields (name/phone/address). */
  async updateProfile(
    id: string,
    data: { name?: string; phone?: string; address?: string },
  ): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  },

  /** Persist a new avatar URL for the user (the old URL is cleaned up by the Cloudinary integration). */
  async updateAvatar(id: string, avatarUrl: string): Promise<User> {
    return prisma.user.update({ where: { id }, data: { avatarUrl } });
  },

  /**
   * A stylist's storefront approval status by their userId, or null if the user
   * has no stylist profile. Lets the auth layer embed `stylistStatus` on the
   * AuthUser so the client can gate the studio without a second round-trip.
   */
  async getStylistStatusByUserId(userId: string): Promise<string | null> {
    const stylist = await prisma.stylist.findUnique({
      where: { userId },
      select: { status: true },
    });
    return stylist?.status ?? null;
  },

  /**
   * Purge refresh tokens persisted in Postgres that are past expiry or revoked
   * (CLAUDE.md §10 retention). The live whitelist lives in Redis and self-expires
   * via TTL; this keeps the audit-friendly DB table from accumulating dead rows.
   * Idempotent — a second run finds nothing. The `expiresAt` index serves the scan.
   */
  async purgeExpiredRefreshTokens(now: Date = new Date()): Promise<number> {
    const { count } = await prisma.refreshToken.deleteMany({
      where: { OR: [{ expiresAt: { lt: now } }, { revoked: true }] },
    });
    return count;
  },

  // ─── Password reset ──────────────────────────────────────────────────────────

  /**
   * Delete any prior reset tokens for this user, then insert a new one.
   * Keeping only one active token per user prevents token accumulation and
   * ensures that requesting a new reset invalidates any previously-sent link.
   */
  async savePasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<PasswordReset> {
    return prisma.$transaction(async (tx) => {
      await tx.passwordReset.deleteMany({ where: { userId } });
      return tx.passwordReset.create({ data: { userId, tokenHash, expiresAt } });
    });
  },

  /**
   * Find a password reset record by its hashed token. Used for both validation
   * and consumption. Returns null when not found (treat as invalid).
   */
  async findPasswordResetByTokenHash(tokenHash: string): Promise<PasswordReset | null> {
    return prisma.passwordReset.findUnique({ where: { tokenHash } });
  },

  /**
   * Atomically consume a reset token and set the user's new password (§11).
   * Both writes share ONE transaction: either the token is marked used AND the
   * password changes, or neither does — a partial failure can never leave a
   * consumed token with an unchanged password (or vice-versa).
   *
   * The token is consumed with a conditional `updateMany` on `usedAt: null`, so
   * two concurrent requests replaying the same link can't both succeed — the
   * loser sees `count === 0` and we return false (caller treats as invalid).
   */
  async consumeResetAndUpdatePassword(
    resetId: string,
    userId: string,
    passwordHash: string,
  ): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordReset.updateMany({
        where: { id: resetId, usedAt: null },
        data: { usedAt: new Date() },
      });
      // Already consumed by a racing request — abort without touching the password.
      if (consumed.count === 0) return false;
      await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      return true;
    });
  },

  /** Update the stored password hash — the only place a password is changed. */
  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  },

  /**
   * Delete all password reset tokens for a user (cleanup after successful reset
   * or as part of account deletion). Idempotent.
   */
  async deletePasswordResetsByUserId(userId: string): Promise<void> {
    await prisma.passwordReset.deleteMany({ where: { userId } });
  },

  /** Cron-friendly cleanup: purge all expired or used reset tokens. */
  async purgeExpiredPasswordResets(now: Date = new Date()): Promise<number> {
    const { count } = await prisma.passwordReset.deleteMany({
      where: { OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }] },
    });
    return count;
  },
};

/** Type guard for Prisma's unique-constraint violation (duplicate email). */
export function isUniqueConstraintError(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}
