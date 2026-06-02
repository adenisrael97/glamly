import cron, { type ScheduledTask } from "node-cron";
import { logger } from "../lib/logger";
import { authRepository } from "../repositories/auth.repository";

// Token-retention sweep (CLAUDE.md §10). The live refresh-token whitelist lives
// in Redis and self-expires via TTL; this job purges any expired/revoked refresh
// tokens persisted in Postgres so the table doesn't grow unbounded. Idempotent
// and safe to run on a schedule — a second pass finds nothing.

/** One cleanup pass. Exported for unit testing without a scheduler. */
export async function runCleanTokens(now: Date = new Date()): Promise<{ purged: number }> {
  try {
    const purged = await authRepository.purgeExpiredRefreshTokens(now);
    if (purged > 0) logger.info("Purged expired/revoked refresh tokens", { count: purged });
    return { purged };
  } catch (err) {
    logger.error("cleanTokens job failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { purged: 0 };
  }
}

let task: ScheduledTask | undefined;

/** Schedule the daily token cleanup (03:00). Returns a stop function. */
export function scheduleCleanTokens(): () => void {
  if (task) return () => stopCleanTokens();
  task = cron.schedule("0 3 * * *", () => {
    void runCleanTokens();
  });
  return () => stopCleanTokens();
}

export function stopCleanTokens(): void {
  if (task) {
    task.stop();
    task = undefined;
  }
}
