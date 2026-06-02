import { Prisma, PaymentStatus, BookingStatus, Payment } from "@prisma/client";
import { prisma } from "../lib/prisma";

export interface CreatePendingData {
  bookingId: string;
  userId: string;
  amountKobo: number;
  currency: string;
  reference: string;
}

/**
 * Outcome of processing a `charge.success` webhook. The service maps each case
 * to side effects (audit, email/push) AFTER the transaction commits. Every case
 * is idempotent: replaying the same event lands on `already_success`.
 */
export type ConfirmResult =
  | { kind: "no_payment" }
  | { kind: "amount_mismatch"; expected: number; got: number }
  | { kind: "already_success"; payment: Payment }
  | { kind: "confirmed"; bookingId: string; payment: Payment }
  // Money captured but the slot was already released (e.g. the expiry job
  // cancelled the booking first). Needs a refund decision — surfaced, not swallowed.
  | { kind: "paid_booking_not_pending"; bookingId: string; bookingStatus: BookingStatus; payment: Payment };

function isUnique(err: unknown): err is Prisma.PrismaClientKnownRequestError {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export const paymentsRepository = {
  findByBookingId(bookingId: string) {
    return prisma.payment.findUnique({ where: { bookingId } });
  },

  findByReference(reference: string) {
    return prisma.payment.findUnique({ where: { paystackRef: reference } });
  },

  /**
   * Re-arm a previously FAILED payment for another checkout attempt: a fresh
   * reference, back to PENDING, clearing any prior gateway event. The booking is
   * still PENDING (the service guards that), so the slot is genuinely re-payable.
   */
  reinitialize(paymentId: string, reference: string, amountKobo: number) {
    return prisma.payment.update({
      where: { id: paymentId },
      data: {
        paystackRef: reference,
        amount: amountKobo,
        status: PaymentStatus.PENDING,
        paystackEventId: null,
        paidAt: null,
      },
    });
  },

  createPending(data: CreatePendingData) {
    return prisma.payment.create({
      data: {
        bookingId: data.bookingId,
        userId: data.userId,
        amount: data.amountKobo,
        currency: data.currency,
        status: PaymentStatus.PENDING,
        paystackRef: data.reference,
      },
    });
  },

  /**
   * Atomically confirm a successful charge (CLAUDE.md §6, §11):
   *   1. Match the payment by the reference we generated.
   *   2. Reject an amount that doesn't equal what we asked Paystack to charge.
   *   3. Claim the payment PENDING → SUCCESS with a guarded `updateMany`; a 0-row
   *      claim means another delivery already processed it → idempotent replay.
   *   4. Confirm the booking PENDING → CONFIRMED, but ONLY if still PENDING. If the
   *      expiry job cancelled it first, the payment is still recorded SUCCESS and
   *      the mismatch is surfaced for a refund rather than silently lost.
   *
   * `paystackEventId` (the Paystack transaction id) is also stored as a unique
   * key; a P2002 on it (a rare concurrent double-claim) is treated as a replay.
   */
  async confirmFromWebhook(params: {
    reference: string;
    eventId: string;
    amountKobo: number;
    paidAt: Date | null;
  }): Promise<ConfirmResult> {
    try {
      return await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findUnique({ where: { paystackRef: params.reference } });
        if (!payment) return { kind: "no_payment" };
        if (payment.status === PaymentStatus.SUCCESS) {
          return { kind: "already_success", payment };
        }
        if (payment.amount !== params.amountKobo) {
          return { kind: "amount_mismatch", expected: payment.amount, got: params.amountKobo };
        }

        const claim = await tx.payment.updateMany({
          where: { id: payment.id, status: PaymentStatus.PENDING },
          data: {
            status: PaymentStatus.SUCCESS,
            paystackEventId: params.eventId,
            paidAt: params.paidAt ?? new Date(),
          },
        });
        // Lost the race to claim — another concurrent delivery won. Replay.
        if (claim.count === 0) return { kind: "already_success", payment };

        const updated = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });

        const confirmed = await tx.booking.updateMany({
          where: { id: payment.bookingId, status: BookingStatus.PENDING },
          data: { status: BookingStatus.CONFIRMED },
        });
        if (confirmed.count === 1) {
          return { kind: "confirmed", bookingId: payment.bookingId, payment: updated };
        }

        const booking = await tx.booking.findUnique({
          where: { id: payment.bookingId },
          select: { status: true },
        });
        return {
          kind: "paid_booking_not_pending",
          bookingId: payment.bookingId,
          bookingStatus: booking?.status ?? BookingStatus.CANCELLED,
          payment: updated,
        };
      });
    } catch (err) {
      // Concurrent claim collided on the unique paystackEventId — idempotent replay.
      if (isUnique(err)) {
        const payment = await prisma.payment.findUnique({
          where: { paystackRef: params.reference },
        });
        if (payment) return { kind: "already_success", payment };
      }
      throw err;
    }
  },

  /**
   * Record a failed/abandoned charge. Only moves a still-PENDING payment to
   * FAILED (never overwrites a SUCCESS), so it is safe to replay.
   */
  async markFailedByReference(reference: string): Promise<void> {
    await prisma.payment.updateMany({
      where: { paystackRef: reference, status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.FAILED },
    });
  },

  /**
   * Fail any still-PENDING payment for a booking — used when the booking is
   * auto-expired. Never touches a SUCCESS payment, so it is safe to call after
   * a confirm that lost the race.
   */
  async markFailedByBookingId(bookingId: string): Promise<void> {
    await prisma.payment.updateMany({
      where: { bookingId, status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.FAILED },
    });
  },
};
