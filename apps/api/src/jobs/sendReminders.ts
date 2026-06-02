import cron, { type ScheduledTask } from "node-cron";
import { logger } from "../lib/logger";
import { bookingsRepository } from "../repositories/bookings.repository";
import { notificationsService } from "../services/notifications.service";

// 24h appointment reminder (CLAUDE.md §5). Runs hourly: any CONFIRMED booking
// that has entered the next-24h window and hasn't been reminded yet is claimed
// (reminderSentAt stamped) and then reminded. The claim-before-send pattern makes
// the job idempotent and safe against overlapping runs — a booking is reminded
// exactly once even if two ticks race (§11).

const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * One reminder sweep. Exported as a plain function so it can be unit-tested
 * without a scheduler. Returns how many reminders were actually sent.
 */
export async function runSendReminders(now: Date = new Date()): Promise<{ reminded: number }> {
  const horizon = new Date(now.getTime() + REMINDER_WINDOW_MS);

  let due: { id: string }[];
  try {
    due = await bookingsRepository.findDueReminders(now, horizon);
  } catch (err) {
    logger.error("sendReminders job failed to query due bookings", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { reminded: 0 };
  }

  let reminded = 0;
  for (const booking of due) {
    // Claim first; only the run that wins the claim sends, so no double reminders.
    const claimed = await bookingsRepository.claimReminder(booking.id);
    if (!claimed) continue;
    await notificationsService.sendBookingReminder(booking.id);
    reminded += 1;
  }

  if (reminded > 0) logger.info("Sent booking reminders", { count: reminded });
  return { reminded };
}

let task: ScheduledTask | undefined;

/** Schedule the hourly reminder sweep. Returns a stop function for shutdown. */
export function scheduleSendReminders(): () => void {
  if (task) return () => stopSendReminders();
  // Top of every hour.
  task = cron.schedule("0 * * * *", () => {
    void runSendReminders();
  });
  return () => stopSendReminders();
}

export function stopSendReminders(): void {
  if (task) {
    task.stop();
    task = undefined;
  }
}
