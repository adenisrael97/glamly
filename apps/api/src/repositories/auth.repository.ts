import { Prisma, User } from "@prisma/client";
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
};

/** Type guard for Prisma's unique-constraint violation (duplicate email). */
export function isUniqueConstraintError(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}
