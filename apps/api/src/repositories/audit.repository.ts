import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

export interface AuditEvent {
  /** Null for actor-less events (e.g. a login attempt for an unknown email). */
  userId: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  /** Non-PII context only — never names, emails, phones, or tokens. */
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export const auditRepository = {
  // Audit writes are best-effort: a failure to record an event must never break
  // the user-facing operation (e.g. don't fail a login because the audit insert
  // hiccuped). We log the failure and move on rather than throw.
  async record(event: AuditEvent): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: event.userId,
          action: event.action,
          entityType: event.entityType,
          entityId: event.entityId,
          metadata: (event.metadata as object | undefined) ?? undefined,
          ipAddress: event.ipAddress,
        },
      });
    } catch (err) {
      logger.error("Failed to write audit log", {
        action: event.action,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },
};
