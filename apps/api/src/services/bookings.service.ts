import {
  PAGINATION_DEFAULT_PAGE_SIZE,
  PAGINATION_MAX_PAGE_SIZE,
  BOOKING_MAX_ADVANCE_DAYS,
  BOOKING_WORKING_HOURS_END,
  isValidSlotStart,
  ROLES,
  type Role,
  type CreateBookingInput,
  type RescheduleBookingInput,
  type CancelBookingInput,
  type ListBookingsQuery,
  type BookingStatus,
} from "@glamly/shared";
import { bookingsRepository } from "../repositories/bookings.repository";
import { stylistsRepository } from "../repositories/stylists.repository";
import { servicesRepository } from "../repositories/services.repository";
import { packagesRepository } from "../repositories/packages.repository";
import { auditRepository } from "../repositories/audit.repository";
import { notificationsService } from "./notifications.service";
import {
  BookingNotFoundError,
  ForbiddenError,
  InvalidBookingStateError,
  NotFoundError,
  SlotTakenError,
  SlotUnavailableError,
} from "../errors/AppError";

export interface Actor {
  userId: string;
  role: Role;
}

interface Context {
  ipAddress?: string;
}

// Statuses from which a customer/stylist transition is allowed.
const RESCHEDULABLE: BookingStatus[] = ["PENDING", "CONFIRMED"];
const CANCELLABLE: BookingStatus[] = ["PENDING", "CONFIRMED"];
const COMPLETABLE: BookingStatus[] = ["PENDING", "CONFIRMED"];

function clampPagination(query: { page?: number; limit?: number }) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(
    Math.max(1, query.limit ?? PAGINATION_DEFAULT_PAGE_SIZE),
    PAGINATION_MAX_PAGE_SIZE,
  );
  return { page, limit };
}

/** Validate a requested slot and return its computed end time, or throw. */
function resolveEndTime(start: Date, durationMinutes: number): Date {
  if (!isValidSlotStart(start)) {
    throw new SlotUnavailableError(
      "Bookings must start on the hour within working hours (09:00–18:00 UTC)",
    );
  }
  const now = new Date();
  if (start <= now) throw new SlotUnavailableError("Cannot book a slot in the past");

  const horizon = new Date(now.getTime() + BOOKING_MAX_ADVANCE_DAYS * 86_400_000);
  if (start > horizon) {
    throw new SlotUnavailableError(
      `Bookings can be made at most ${BOOKING_MAX_ADVANCE_DAYS} days in advance`,
    );
  }

  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const closing = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), BOOKING_WORKING_HOURS_END),
  );
  if (end > closing) {
    throw new SlotUnavailableError("The service would run past the stylist's closing time that day");
  }
  return end;
}

export const bookingsService = {
  async create(actor: Actor, input: CreateBookingInput, ctx: Context = {}) {
    // Idempotent retry short-circuit (CLAUDE.md §11).
    if (input.idempotencyKey) {
      const existing = await bookingsRepository.findByIdempotencyKey(input.idempotencyKey);
      if (existing) {
        if (existing.userId !== actor.userId) {
          throw new ForbiddenError("Idempotency key already used by another account");
        }
        return { booking: existing, idempotentReplay: true };
      }
    }

    const stylist = await stylistsRepository.findActiveById(input.stylistId);
    if (!stylist) throw new NotFoundError("Stylist not found");
    if (!stylist.isAvailable) {
      throw new SlotUnavailableError("This stylist is not currently accepting bookings");
    }

    let totalAmount: number;
    let durationMinutes: number;
    let primaryServiceId: string | undefined;
    let bookingServiceRows: { serviceId: string; price: number }[] = [];
    let packageId: string | undefined;

    if (input.packageId) {
      // Package-based booking — price, duration, and service list from the package.
      const pkg = await packagesRepository.findById(input.packageId);
      if (!pkg || pkg.stylistId !== input.stylistId) {
        throw new NotFoundError("Package not found for this stylist");
      }
      totalAmount = pkg.price;
      durationMinutes = pkg.duration;
      packageId = pkg.id;
      bookingServiceRows = pkg.services.map((s) => ({ serviceId: s.serviceId, price: s.service.price }));
      primaryServiceId = bookingServiceRows[0]?.serviceId;
    } else {
      // Multi-service booking — sum prices, snapshot each price into BookingService.
      const ids = input.serviceIds ?? [];
      const services = await servicesRepository.findAllByIdsForStylist(ids, input.stylistId);
      if (services.length !== ids.length) {
        throw new NotFoundError("One or more services not found for this stylist");
      }
      totalAmount = services.reduce((sum, s) => sum + s.price, 0);
      durationMinutes = services.reduce((sum, s) => sum + s.duration, 0);
      const priceMap = new Map(services.map((s) => [s.id, s.price]));
      bookingServiceRows = ids.map((id) => ({ serviceId: id, price: priceMap.get(id) ?? 0 }));
      primaryServiceId = ids[0];
    }

    const startTime = new Date(input.startTime);
    const endTime = resolveEndTime(startTime, durationMinutes);

    const result = await bookingsRepository.createWithSlotGuard({
      userId: actor.userId,
      stylistId: input.stylistId,
      serviceId: primaryServiceId,
      packageId,
      serviceIds: bookingServiceRows,
      startTime,
      endTime,
      totalAmount,
      notes: input.notes,
      idempotencyKey: input.idempotencyKey,
    });

    if (!result.ok) {
      if (result.reason === "IDEMPOTENT_DUPLICATE") {
        const existing = await bookingsRepository.findByIdWithDetails(result.bookingId);
        if (existing) return { booking: existing, idempotentReplay: true };
      }
      throw new SlotTakenError();
    }

    await auditRepository.record({
      userId: actor.userId,
      action: "BOOKING_CREATED",
      entityType: "Booking",
      entityId: result.booking.id,
      metadata: {
        stylistId: input.stylistId,
        serviceIds: bookingServiceRows.map((r) => r.serviceId),
        packageId,
      },
      ipAddress: ctx.ipAddress,
    });

    notificationsService.notifySlotLocked({ stylistId: input.stylistId, startTime, endTime });

    return { booking: result.booking, idempotentReplay: false };
  },

  /**
   * Role-aware "my bookings": a USER (or ADMIN) sees bookings they made as a
   * customer; a STYLIST sees bookings on their storefront (their provider view).
   */
  async listMine(actor: Actor, query: ListBookingsQuery) {
    const { page, limit } = clampPagination(query);

    if (actor.role === ROLES.STYLIST) {
      const stylistId = await stylistsRepository.findIdByUserId(actor.userId);
      if (!stylistId) return { items: [], meta: emptyMeta(page, limit), view: "provider" as const };
      const { items, total } = await bookingsRepository.listForStylist({
        stylistId,
        page,
        limit,
        status: query.status,
      });
      return { items, meta: meta(page, limit, total), view: "provider" as const };
    }

    const { items, total } = await bookingsRepository.listForUser({
      userId: actor.userId,
      page,
      limit,
      status: query.status,
    });
    return { items, meta: meta(page, limit, total), view: "customer" as const };
  },

  /** Fetch a single booking the actor is allowed to see (customer, provider, or admin). */
  async getByIdForActor(actor: Actor, bookingId: string) {
    const booking = await bookingsRepository.findByIdWithDetails(bookingId);
    if (!booking) throw new BookingNotFoundError();

    const isCustomer = booking.userId === actor.userId;
    const isProvider =
      actor.role === ROLES.STYLIST &&
      (await stylistsRepository.findIdByUserId(actor.userId)) === booking.stylistId;
    if (actor.role !== ROLES.ADMIN && !isCustomer && !isProvider) {
      throw new ForbiddenError("You do not have access to this booking");
    }
    return booking;
  },

  async cancel(actor: Actor, bookingId: string, input: CancelBookingInput, ctx: Context = {}) {
    const booking = await this.loadOwnedByCustomer(actor, bookingId);
    if (!CANCELLABLE.includes(booking.status as BookingStatus)) {
      throw new InvalidBookingStateError(
        `A ${booking.status.toLowerCase()} booking cannot be cancelled`,
      );
    }

    const updated = await bookingsRepository.cancel(bookingId, input.reason);
    await auditRepository.record({
      userId: actor.userId,
      action: "BOOKING_CANCELLED",
      entityType: "Booking",
      entityId: bookingId,
      ipAddress: ctx.ipAddress,
    });

    // Post-commit (§11): notify both parties and free the slot. Fire-and-forget.
    void notificationsService.sendBookingCancelled(bookingId);

    return updated;
  },

  async reschedule(
    actor: Actor,
    bookingId: string,
    input: RescheduleBookingInput,
    ctx: Context = {},
  ) {
    const booking = await this.loadOwnedByCustomer(actor, bookingId);
    if (!RESCHEDULABLE.includes(booking.status as BookingStatus)) {
      throw new InvalidBookingStateError(
        `A ${booking.status.toLowerCase()} booking cannot be rescheduled`,
      );
    }

    const startTime = new Date(input.startTime);
    // For multi-service bookings, derive duration from total BookingService durations;
    // fall back to the legacy single-service duration if available.
    const totalDuration =
      booking.services.length > 0
        ? booking.services.reduce((sum, bs) => sum + bs.service.duration, 0)
        : (booking.service?.duration ?? 60);
    const endTime = resolveEndTime(startTime, totalDuration);

    const result = await bookingsRepository.rescheduleWithSlotGuard({
      bookingId,
      stylistId: booking.stylistId,
      startTime,
      endTime,
    });
    if (!result.ok) throw new SlotTakenError();

    await auditRepository.record({
      userId: actor.userId,
      action: "BOOKING_RESCHEDULED",
      entityType: "Booking",
      entityId: bookingId,
      metadata: { startTime: startTime.toISOString() },
      ipAddress: ctx.ipAddress,
    });
    return result.booking;
  },

  /**
   * Mark a booking completed. This is a PROVIDER action: only the stylist whose
   * storefront the booking is on (or an admin) may complete it. Required before
   * the customer can leave a review.
   */
  async complete(actor: Actor, bookingId: string, ctx: Context = {}) {
    const booking = await bookingsRepository.findById(bookingId);
    if (!booking) throw new BookingNotFoundError();

    const isProvider =
      actor.role === ROLES.STYLIST &&
      (await stylistsRepository.findIdByUserId(actor.userId)) === booking.stylistId;
    if (actor.role !== ROLES.ADMIN && !isProvider) {
      throw new ForbiddenError("Only the assigned stylist can complete this booking");
    }

    if (!COMPLETABLE.includes(booking.status as BookingStatus)) {
      throw new InvalidBookingStateError(
        `A ${booking.status.toLowerCase()} booking cannot be completed`,
      );
    }

    const updated = await bookingsRepository.markCompleted(bookingId);
    await auditRepository.record({
      userId: actor.userId,
      action: "BOOKING_COMPLETED",
      entityType: "Booking",
      entityId: bookingId,
      ipAddress: ctx.ipAddress,
    });
    return updated;
  },

  /** Load a booking and assert the actor is its customer (ownership guard). */
  async loadOwnedByCustomer(actor: Actor, bookingId: string) {
    const booking = await bookingsRepository.findByIdWithDetails(bookingId);
    if (!booking) throw new BookingNotFoundError();
    // Admins bypass ownership; everyone else must own the booking as the customer.
    if (actor.role !== ROLES.ADMIN && booking.userId !== actor.userId) {
      throw new ForbiddenError("You can only modify your own bookings");
    }
    return booking;
  },
};

function meta(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
function emptyMeta(page: number, limit: number) {
  return { page, limit, total: 0, totalPages: 0 };
}
