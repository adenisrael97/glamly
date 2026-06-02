import { BOOKING_PAYMENT_EXPIRY_MINUTES } from "@glamly/shared";
import { logger } from "../lib/logger";
import { bookingsRepository } from "../repositories/bookings.repository";
import { paymentsRepository } from "../repositories/payments.repository";
import { auditRepository } from "../repositories/audit.repository";

/**
 * Cancel bookings that have sat PENDING (unpaid) longer than the payment window
 * (CLAUDE.md §11). A PENDING booking still holds its slot, so abandoned checkouts
 * must be released. The cancel is race-safe against a late webhook confirm — see
 * bookingsRepository.expireStalePending — so a payment landing at minute 30 either
 * confirms the booking OR the job cancels it, never both.
 *
 * Idempotent and safe to run on an interval: a second pass finds nothing.
 * Exported as a plain function so it can be unit-tested without a timer.
 */
export async function runExpireBookings(): Promise<{ expired: number }> {
  const cutoff = new Date(Date.now() - BOOKING_PAYMENT_EXPIRY_MINUTES * 60_000);

  let expired: { id: string; userId: string }[];
  try {
    expired = await bookingsRepository.expireStalePending(cutoff);
  } catch (err) {
    logger.error("expireBookings job failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { expired: 0 };
  }

  for (const booking of expired) {
    // Fail the abandoned payment (no-op if it somehow succeeded) and record it.
    await paymentsRepository.markFailedByBookingId(booking.id);
    await auditRepository.record({
      userId: booking.userId,
      action: "BOOKING_EXPIRED",
      entityType: "Booking",
      entityId: booking.id,
      metadata: { reason: "payment_window_elapsed", minutes: BOOKING_PAYMENT_EXPIRY_MINUTES },
    });
  }

  if (expired.length > 0) {
    logger.info("Expired unpaid bookings", { count: expired.length });
  }
  return { expired: expired.length };
}

let timer: NodeJS.Timeout | undefined;

/**
 * Start the recurring sweep. Runs every `intervalMs` (default 60s). A guard
 * prevents overlapping runs if one sweep outlives the interval. Returns a stop
 * function for graceful shutdown.
 */
export function scheduleExpireBookings(intervalMs = 60_000): () => void {
  if (timer) return () => stopExpireBookings();

  let running = false;
  timer = setInterval(() => {
    if (running) return;
    running = true;
    void runExpireBookings().finally(() => {
      running = false;
    });
  }, intervalMs);
  // Don't keep the event loop alive solely for this timer.
  timer.unref();

  return () => stopExpireBookings();
}

export function stopExpireBookings(): void {
  if (timer) {
    clearInterval(timer);
    timer = undefined;
  }
}
