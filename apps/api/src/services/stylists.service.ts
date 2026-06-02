import {
  PAGINATION_DEFAULT_PAGE_SIZE,
  PAGINATION_MAX_PAGE_SIZE,
  BOOKING_MAX_ADVANCE_DAYS,
  BOOKING_SLOT_INTERVAL_MINUTES,
  BOOKING_WORKING_HOURS_END,
  generateDaySlots,
  intervalsOverlap,
  type ListStylistsQuery,
  type AvailabilityQuery,
} from "@glamly/shared";
import { stylistsRepository } from "../repositories/stylists.repository";
import { servicesRepository } from "../repositories/services.repository";
import { NotFoundError } from "../errors/AppError";

interface BookedInterval {
  startTime: Date;
  endTime: Date;
}

export interface Slot {
  startTime: Date;
  endTime: Date;
}

/**
 * Pure slot computation: every grid slot in [fromDay, fromDay+days) that is
 * in the future, finishes before closing, and clashes with no existing booking.
 * Extracted so it can be unit-tested without a database.
 */
export function availableSlotsForRange(opts: {
  fromDay: Date;
  days: number;
  durationMinutes: number;
  bookings: BookedInterval[];
  now: Date;
}): Slot[] {
  const { fromDay, days, durationMinutes, bookings, now } = opts;
  const slots: Slot[] = [];

  for (let offset = 0; offset < days; offset++) {
    const day = new Date(
      Date.UTC(fromDay.getUTCFullYear(), fromDay.getUTCMonth(), fromDay.getUTCDate() + offset),
    );
    const closing = new Date(
      Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), BOOKING_WORKING_HOURS_END),
    );

    for (const slotStart of generateDaySlots(day)) {
      if (slotStart < now) continue; // slot is in the past
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60_000);
      if (slotEnd > closing) continue; // would run past closing time
      const clash = bookings.some((b) =>
        intervalsOverlap(slotStart, slotEnd, b.startTime, b.endTime),
      );
      if (!clash) slots.push({ startTime: slotStart, endTime: slotEnd });
    }
  }

  return slots;
}

/** Parse a YYYY-MM-DD param to a UTC-midnight Date, defaulting to today (UTC). */
function startDayUtc(date?: string): Date {
  const base = date ? new Date(`${date}T00:00:00.000Z`) : new Date();
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
}

export const stylistsService = {
  async list(query: ListStylistsQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(
      Math.max(1, query.limit ?? PAGINATION_DEFAULT_PAGE_SIZE),
      PAGINATION_MAX_PAGE_SIZE,
    );

    const { items, total } = await stylistsRepository.findMany({
      page,
      limit,
      search: query.search,
      category: query.category,
      location: query.location,
      specialty: query.specialty,
      minRating: query.minRating,
      available: query.available,
      sort: query.sort ?? "rating",
      order: query.order ?? "desc",
    });

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  /** Profile + active services + ratings summary + a light availability summary. */
  async getById(id: string) {
    const stylist = await stylistsRepository.findDetailById(id);
    if (!stylist) throw new NotFoundError("Stylist not found");

    const { rating, reviewCount, ...rest } = stylist;

    // Next bookable slot across the booking horizon — a cheap UI affordance.
    const nextAvailableSlot = stylist.isAvailable
      ? (await this.computeSlots(id, { days: BOOKING_MAX_ADVANCE_DAYS }))[0]?.startTime ?? null
      : null;

    return {
      ...rest,
      ratingsSummary: {
        average: Number(rating.toFixed(2)),
        count: reviewCount,
      },
      availability: {
        isAvailable: stylist.isAvailable,
        nextAvailableSlot: nextAvailableSlot ? nextAvailableSlot.toISOString() : null,
      },
    };
  },

  /** Full available-slot listing for the dedicated availability endpoint. */
  async getAvailability(id: string, query: AvailabilityQuery) {
    const stylist = await stylistsRepository.findActiveById(id);
    if (!stylist) throw new NotFoundError("Stylist not found");

    // Slot length is the chosen service's duration, or one grid interval.
    let durationMinutes = BOOKING_SLOT_INTERVAL_MINUTES;
    if (query.serviceId) {
      const service = await servicesRepository.findById(query.serviceId);
      // Only a service belonging to THIS stylist is meaningful for its calendar.
      if (!service || service.stylistId !== id) {
        throw new NotFoundError("Service not found for this stylist");
      }
      durationMinutes = service.duration;
    }

    const days = query.days ?? 7;
    const fromDay = startDayUtc(query.date);
    const slots = stylist.isAvailable
      ? await this.computeSlots(id, { fromDay, days, durationMinutes })
      : [];

    return {
      stylistId: id,
      isAvailable: stylist.isAvailable,
      durationMinutes,
      from: fromDay.toISOString(),
      days,
      slots: slots.map((s) => ({
        startTime: s.startTime.toISOString(),
        endTime: s.endTime.toISOString(),
      })),
    };
  },

  /** Shared slot engine: load the relevant bookings once, then compute purely. */
  async computeSlots(
    stylistId: string,
    opts: { fromDay?: Date; days: number; durationMinutes?: number },
  ): Promise<Slot[]> {
    const now = new Date();
    const fromDay = opts.fromDay ?? startDayUtc();
    // Never search before "now" — past days yield no future slots.
    const rangeStart = fromDay < now ? now : fromDay;
    const rangeEnd = new Date(
      Date.UTC(fromDay.getUTCFullYear(), fromDay.getUTCMonth(), fromDay.getUTCDate() + opts.days),
    );

    const bookings = await stylistsRepository.findActiveBookingsInRange(
      stylistId,
      rangeStart,
      rangeEnd,
    );

    return availableSlotsForRange({
      fromDay,
      days: opts.days,
      durationMinutes: opts.durationMinutes ?? BOOKING_SLOT_INTERVAL_MINUTES,
      bookings,
      now,
    });
  },
};
