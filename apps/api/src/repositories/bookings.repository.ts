import { Prisma, BookingStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ACTIVE_BOOKING_STATUSES } from "@glamly/shared";

// ─── Shared shapes ────────────────────────────────────────────────────────────

// Booking + the related data the API returns. One query, no N+1.
const bookingInclude = {
  service: {
    select: { id: true, name: true, category: true, price: true, duration: true },
  },
  services: {
    select: {
      id: true,
      serviceId: true,
      price: true,
      service: { select: { id: true, name: true, category: true, price: true, duration: true, imageUrl: true } },
    },
  },
  package: {
    select: { id: true, name: true, price: true, duration: true },
  },
  // The customer who booked. Their contact (phone/address) is needed by the
  // assigned stylist to fulfil the appointment. This DTO is only ever returned
  // to the booking owner (their own data), the assigned stylist (provider view),
  // or an admin — never on a public route (CLAUDE.md §10, J2).
  user: {
    select: { id: true, name: true, phone: true, address: true },
  },
  stylist: {
    select: {
      id: true,
      specialty: true,
      location: true,
      avatarUrl: true,
      user: { select: { name: true } },
    },
  },
} satisfies Prisma.BookingInclude;

export interface CreateBookingData {
  userId: string;
  stylistId: string;
  serviceId?: string;
  packageId?: string;
  serviceIds?: { serviceId: string; price: number }[];
  startTime: Date;
  endTime: Date;
  totalAmount: number;
  notes?: string;
  idempotencyKey?: string;
}

export type SlotWriteResult =
  | { ok: true; booking: Prisma.BookingGetPayload<{ include: typeof bookingInclude }> }
  | { ok: false; reason: "SLOT_TAKEN" }
  | { ok: false; reason: "IDEMPOTENT_DUPLICATE"; bookingId: string };

/** True for Prisma's unique-constraint violation. */
function isUnique(err: unknown): err is Prisma.PrismaClientKnownRequestError {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/** The constraint/field(s) a P2002 fired on, flattened to a searchable string. */
function uniqueTarget(err: Prisma.PrismaClientKnownRequestError): string {
  const t = err.meta?.target;
  return Array.isArray(t) ? t.join(",") : String(t ?? "");
}

const overlapWhere = (stylistId: string, start: Date, end: Date, excludeId?: string) => ({
  stylistId,
  status: { in: [...ACTIVE_BOOKING_STATUSES] as BookingStatus[] },
  startTime: { lt: end },
  endTime: { gt: start },
  ...(excludeId ? { id: { not: excludeId } } : {}),
});

export const bookingsRepository = {
  async findById(id: string) {
    return prisma.booking.findUnique({ where: { id } });
  },

  async findByIdWithDetails(id: string) {
    return prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  },

  /**
   * Fetch everything the notifications layer needs to reach BOTH parties: the
   * customer (who booked) and the stylist's owning user (the provider). Selecting
   * each side's id/name/email explicitly keeps recipient targeting unambiguous —
   * the customer's contact is never confused with the stylist's. One query, no N+1.
   */
  async findByIdForNotification(id: string) {
    return prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        startTime: true,
        endTime: true,
        totalAmount: true,
        cancellationReason: true,
        service: { select: { name: true } },
        // The customer side.
        user: { select: { id: true, name: true, email: true } },
        // The provider side: the stylist row plus its owning user's contact.
        stylist: {
          select: {
            id: true,
            location: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
  },

  async findByIdempotencyKey(key: string) {
    return prisma.booking.findUnique({ where: { idempotencyKey: key }, include: bookingInclude });
  },

  async listForUser(params: { userId: string; page: number; limit: number; status?: BookingStatus }) {
    const where: Prisma.BookingWhereInput = {
      userId: params.userId,
      ...(params.status ? { status: params.status } : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.booking.findMany({
        where,
        include: bookingInclude,
        orderBy: { startTime: "desc" },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.booking.count({ where }),
    ]);
    return { items, total };
  },

  async listForStylist(params: {
    stylistId: string;
    page: number;
    limit: number;
    status?: BookingStatus;
  }) {
    const where: Prisma.BookingWhereInput = {
      stylistId: params.stylistId,
      ...(params.status ? { status: params.status } : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.booking.findMany({
        where,
        include: bookingInclude,
        orderBy: { startTime: "desc" },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.booking.count({ where }),
    ]);
    return { items, total };
  },

  /**
   * Create a booking under the double-booking guard (CLAUDE.md §11).
   *
   * Safety layers, strongest last:
   *  1. `pg_advisory_xact_lock` keyed on the stylist serialises every concurrent
   *     booking write for that stylist, so the overlap read below cannot race.
   *  2. An overlap query rejects any clash with an active booking — this catches
   *     multi-hour services that the exact-startTime unique index can't see.
   *  3. The partial unique index `bookings_active_slot_key` is the ultimate DB
   *     guarantee: even if (1)/(2) had a bug, two active bookings on the same
   *     (stylist, startTime) are impossible. A violation surfaces as P2002.
   *
   * A P2002 on the idempotency key (concurrent same-key retry) is reported back
   * as IDEMPOTENT_DUPLICATE so the service can return the original booking.
   */
  async createWithSlotGuard(data: CreateBookingData): Promise<SlotWriteResult> {
    return prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${data.stylistId}))`;

      const clash = await tx.booking.findFirst({
        where: overlapWhere(data.stylistId, data.startTime, data.endTime),
        select: { id: true },
      });
      if (clash) return { ok: false, reason: "SLOT_TAKEN" };

      try {
        const booking = await tx.booking.create({
          data: {
            userId: data.userId,
            stylistId: data.stylistId,
            serviceId: data.serviceId ?? null,
            packageId: data.packageId ?? null,
            startTime: data.startTime,
            endTime: data.endTime,
            totalAmount: data.totalAmount,
            notes: data.notes,
            idempotencyKey: data.idempotencyKey,
            status: BookingStatus.PENDING,
            ...(data.serviceIds?.length
              ? { services: { create: data.serviceIds } }
              : {}),
          },
          include: bookingInclude,
        });
        return { ok: true, booking };
      } catch (err) {
        if (isUnique(err)) {
          if (uniqueTarget(err).includes("idempotency") && data.idempotencyKey) {
            const existing = await tx.booking.findUnique({
              where: { idempotencyKey: data.idempotencyKey },
              select: { id: true },
            });
            if (existing) return { ok: false, reason: "IDEMPOTENT_DUPLICATE", bookingId: existing.id };
          }
          return { ok: false, reason: "SLOT_TAKEN" };
        }
        throw err;
      }
    });
  },

  /**
   * Move an existing booking to a new slot under the same guard as creation.
   * Excludes the booking's own row from the overlap check so it doesn't clash
   * with itself.
   */
  async rescheduleWithSlotGuard(params: {
    bookingId: string;
    stylistId: string;
    startTime: Date;
    endTime: Date;
  }): Promise<SlotWriteResult> {
    return prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${params.stylistId}))`;

      const clash = await tx.booking.findFirst({
        where: overlapWhere(params.stylistId, params.startTime, params.endTime, params.bookingId),
        select: { id: true },
      });
      if (clash) return { ok: false, reason: "SLOT_TAKEN" };

      try {
        const booking = await tx.booking.update({
          where: { id: params.bookingId },
          data: { startTime: params.startTime, endTime: params.endTime },
          include: bookingInclude,
        });
        return { ok: true, booking };
      } catch (err) {
        if (isUnique(err)) return { ok: false, reason: "SLOT_TAKEN" };
        throw err;
      }
    });
  },

  async cancel(id: string, reason?: string) {
    return prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED, cancelledAt: new Date(), cancellationReason: reason },
      include: bookingInclude,
    });
  },

  async markCompleted(id: string) {
    return prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.COMPLETED },
      include: bookingInclude,
    });
  },

  /**
   * Cancel bookings still PENDING past their payment window (CLAUDE.md §11).
   * Each row is cancelled with a guarded `updateMany` (status = PENDING), so it
   * cannot race the webhook confirm: whichever transition lands first wins, and
   * the other sees a non-PENDING row and affects zero rows. Returns the rows that
   * were actually expired (a subset of the candidates) so the caller can fail the
   * payment and write the audit trail.
   */
  async expireStalePending(cutoff: Date, limit = 100): Promise<{ id: string; userId: string }[]> {
    const candidates = await prisma.booking.findMany({
      where: { status: BookingStatus.PENDING, createdAt: { lt: cutoff } },
      select: { id: true, userId: true },
      take: limit,
    });

    const expired: { id: string; userId: string }[] = [];
    for (const c of candidates) {
      const res = await prisma.booking.updateMany({
        where: { id: c.id, status: BookingStatus.PENDING },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: "Payment not completed in time",
        },
      });
      if (res.count === 1) expired.push(c);
    }
    return expired;
  },

  /**
   * Candidate bookings for a 24h reminder: CONFIRMED, starting within the window
   * (now, horizon], and not yet reminded. Returns ids only — the job claims each
   * one before sending.
   */
  async findDueReminders(now: Date, horizon: Date, limit = 100): Promise<{ id: string }[]> {
    return prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        reminderSentAt: null,
        startTime: { gt: now, lte: horizon },
      },
      select: { id: true },
      take: limit,
    });
  },

  /**
   * Atomically claim a booking for reminding: stamp reminderSentAt only if it's
   * still null. Returns true if THIS call won the claim, so two overlapping job
   * runs can't both send a reminder for the same booking (§11).
   */
  async claimReminder(id: string): Promise<boolean> {
    const res = await prisma.booking.updateMany({
      where: { id, reminderSentAt: null },
      data: { reminderSentAt: new Date() },
    });
    return res.count === 1;
  },
};
