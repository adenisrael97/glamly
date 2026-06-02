import { z } from "zod";
import { limitQueryField, pageQueryField } from "./query";

// ─── Booking status vocabulary ────────────────────────────────────────────────
//
// Mirrors the Prisma `BookingStatus` enum exactly (the DB is the source of
// truth). ACTIVE_BOOKING_STATUSES are the statuses that occupy a slot — only
// these participate in double-booking / availability checks. A CANCELLED or
// COMPLETED booking frees its slot for rebooking.

export const BOOKING_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const ACTIVE_BOOKING_STATUSES = ["PENDING", "CONFIRMED"] as const satisfies readonly BookingStatus[];

// ─── Slot grid ────────────────────────────────────────────────────────────────
//
// Availability is derived (there is no Availability table): every stylist works
// a fixed daily window on an hourly grid. Slot start times are expressed in UTC
// for v1 determinism — Nigeria (WAT) is a fixed UTC+1 offset with no DST, so a
// future iteration can localise to Africa/Lagos without ambiguity. A slot is
// identified solely by its start time; the DB enforces one active booking per
// (stylist, startTime).

export const BOOKING_WORKING_HOURS_START = 9; // first slot starts 09:00 UTC
export const BOOKING_WORKING_HOURS_END = 18; // last slot starts 17:00 UTC (18:00 exclusive)
export const BOOKING_SLOT_INTERVAL_MINUTES = 60;
export const BOOKING_MAX_ADVANCE_DAYS = 14; // how far ahead a customer may book

/** True when `date` falls exactly on a bookable hourly grid slot (UTC). */
export function isValidSlotStart(date: Date): boolean {
  if (Number.isNaN(date.getTime())) return false;
  if (
    date.getUTCMinutes() !== 0 ||
    date.getUTCSeconds() !== 0 ||
    date.getUTCMilliseconds() !== 0
  ) {
    return false;
  }
  const hour = date.getUTCHours();
  return hour >= BOOKING_WORKING_HOURS_START && hour < BOOKING_WORKING_HOURS_END;
}

/** Every grid slot start time for the UTC calendar day containing `day`. */
export function generateDaySlots(day: Date): Date[] {
  const slots: Date[] = [];
  for (
    let hour = BOOKING_WORKING_HOURS_START;
    hour < BOOKING_WORKING_HOURS_END;
    hour += BOOKING_SLOT_INTERVAL_MINUTES / 60
  ) {
    slots.push(
      new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour, 0, 0, 0)),
    );
  }
  return slots;
}

/** Two half-open intervals [aStart,aEnd) and [bStart,bEnd) overlap. */
export function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

// ─── Request schemas ──────────────────────────────────────────────────────────

// An ISO-8601 instant with a `Z`/offset. `.datetime({ offset: true })` accepts
// both `...Z` and `...+01:00`; the service re-validates it lands on the grid.
const isoDateTime = z.string().datetime({ offset: true, message: "Must be an ISO-8601 datetime" });

export const createBookingSchema = z
  .object({
    stylistId: z.string().cuid(),
    // serviceIds and packageId are mutually exclusive. At least one must be provided.
    serviceIds: z.array(z.string().cuid()).min(1).max(10).optional(),
    packageId: z.string().cuid().optional(),
    startTime: isoDateTime,
    notes: z.string().trim().max(500).optional(),
    // Optional client-supplied retry key (CLAUDE.md §11): a retried create with the
    // same key returns the original booking instead of erroring or duplicating.
    idempotencyKey: z.string().trim().min(8).max(200).optional(),
  })
  .refine((d) => d.serviceIds !== undefined || d.packageId !== undefined, {
    message: "Either serviceIds or packageId must be provided",
    path: ["serviceIds"],
  });
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const rescheduleBookingSchema = z.object({
  startTime: isoDateTime,
});
export type RescheduleBookingInput = z.infer<typeof rescheduleBookingSchema>;

export const cancelBookingSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

export const listBookingsQuerySchema = z.object({
  page: pageQueryField,
  limit: limitQueryField,
  status: z.enum(BOOKING_STATUSES).optional(),
});
export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;

export const availabilityQuerySchema = z.object({
  // A single UTC calendar day to inspect (defaults to today).
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
    .optional(),
  // How many days from `date` to return slots for (default 7).
  days: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? Number(v) : undefined))
    .pipe(z.number().int().min(1).max(BOOKING_MAX_ADVANCE_DAYS).optional()),
  // Optional service whose duration determines slot end times for overlap.
  serviceId: z.string().cuid().optional(),
});
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

/** Param schema for routes carrying a booking id (`/bookings/:id/...`). */
export const bookingIdParamSchema = z.object({
  id: z.string().cuid("Invalid booking id"),
});
