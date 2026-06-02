import crypto from "node:crypto";
import {
  nairaToKobo,
  type Role,
  ROLES,
  type InitiatePaymentInput,
  type InitiatePaymentResult,
  type PaymentStatusResult,
} from "@glamly/shared";
import { config } from "../config";
import { logger } from "../lib/logger";
import { paystack, PaystackApiError, type PaystackWebhookEvent } from "../integrations/paystack";
import { paymentsRepository } from "../repositories/payments.repository";
import { bookingsRepository } from "../repositories/bookings.repository";
import { authRepository } from "../repositories/auth.repository";
import { auditRepository } from "../repositories/audit.repository";
import { notificationsService } from "./notifications.service";
import {
  BookingNotFoundError,
  BookingNotPayableError,
  ForbiddenError,
  NotFoundError,
  PaymentGatewayError,
  PaymentNotFoundError,
  WebhookSignatureError,
} from "../errors/AppError";

export interface Actor {
  userId: string;
  role: Role;
}

interface Context {
  ipAddress?: string;
}

/** Outcome of processing one webhook delivery, for the controller's response. */
export interface WebhookOutcome {
  event: string;
  handled: boolean;
}

/** Opaque, Paystack-safe reference: ASCII alphanumerics + hyphens only. */
function generateReference(bookingId: string): string {
  return `glamly-${bookingId}-${crypto.randomBytes(8).toString("hex")}`;
}

export const paymentsService = {
  /**
   * Start a Paystack checkout for a PENDING booking the actor owns. Creates (or
   * re-arms) a PENDING payment row, then asks Paystack for a hosted checkout URL.
   * Confirmation does NOT happen here — only a signed webhook moves the booking
   * to CONFIRMED (CLAUDE.md §6).
   */
  async initiate(
    actor: Actor,
    input: InitiatePaymentInput,
    ctx: Context = {},
  ): Promise<InitiatePaymentResult> {
    const booking = await bookingsRepository.findById(input.bookingId);
    if (!booking) throw new BookingNotFoundError();

    // Only the customer who made the booking (or an admin) may pay for it.
    if (actor.role !== ROLES.ADMIN && booking.userId !== actor.userId) {
      throw new ForbiddenError("You can only pay for your own bookings");
    }

    if (booking.status !== "PENDING") {
      throw new BookingNotPayableError(
        `A ${booking.status.toLowerCase()} booking cannot be paid for`,
      );
    }

    const user = await authRepository.findActiveById(booking.userId);
    if (!user) throw new NotFoundError("Booking owner not found");

    const amountKobo = nairaToKobo(booking.totalAmount);

    // Get-or-create the payment row (bookingId is unique, so one row per booking).
    const existing = await paymentsRepository.findByBookingId(booking.id);
    let reference: string;
    if (!existing) {
      reference = generateReference(booking.id);
      await paymentsRepository.createPending({
        bookingId: booking.id,
        userId: booking.userId,
        amountKobo,
        currency: "NGN",
        reference,
      });
    } else if (existing.status === "PENDING" && existing.paystackRef) {
      // Resume the in-flight checkout with the same reference (idempotent retry).
      reference = existing.paystackRef;
    } else if (existing.status === "FAILED") {
      reference = generateReference(booking.id);
      await paymentsRepository.reinitialize(existing.id, reference, amountKobo);
    } else {
      // SUCCESS or REFUNDED — nothing more to pay.
      throw new BookingNotPayableError("This booking has already been paid for");
    }

    let session: InitiatePaymentResult;
    try {
      session = await paystack.initializeTransaction({
        email: user.email,
        amountKobo,
        reference,
        callbackUrl: config.PAYSTACK_CALLBACK_URL,
        metadata: { bookingId: booking.id, userId: booking.userId },
      });
    } catch (err) {
      if (err instanceof PaystackApiError) {
        logger.error("Paystack initialize failed", {
          bookingId: booking.id,
          error: err.message,
        });
        throw new PaymentGatewayError();
      }
      throw err;
    }

    await auditRepository.record({
      userId: booking.userId,
      action: "PAYMENT_INITIATED",
      entityType: "Booking",
      entityId: booking.id,
      metadata: { amountKobo, reference },
      ipAddress: ctx.ipAddress,
    });

    return session;
  },

  /** Read-only payment status, scoped to the owning customer (or an admin). */
  async getStatusForActor(actor: Actor, reference: string): Promise<PaymentStatusResult> {
    const payment = await paymentsRepository.findByReference(reference);
    if (!payment) throw new PaymentNotFoundError();
    if (actor.role !== ROLES.ADMIN && payment.userId !== actor.userId) {
      // Don't leak existence of another user's payment — same 404 as not-found.
      throw new PaymentNotFoundError();
    }
    return {
      reference,
      bookingId: payment.bookingId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
    };
  },

  /**
   * Process a Paystack webhook. The signed body is the ONLY trusted source for
   * confirming a booking (§6). Steps:
   *   1. Verify the HMAC signature over the raw bytes — reject if absent/wrong.
   *   2. Parse and branch on the event type.
   *   3. For `charge.success`, confirm idempotently via the repository and emit
   *      the appropriate audit/log; every other event is acknowledged & ignored.
   *
   * Returns an outcome; throws only on a bad signature (→ 401). All business
   * cases resolve to a 200 so Paystack stops retrying a delivered event.
   */
  async handleWebhook(rawBody: Buffer, signature: string | undefined): Promise<WebhookOutcome> {
    if (!paystack.verifyWebhookSignature(rawBody, signature)) {
      throw new WebhookSignatureError();
    }

    let event: PaystackWebhookEvent;
    try {
      event = JSON.parse(rawBody.toString("utf8")) as PaystackWebhookEvent;
    } catch {
      // Signature matched but body isn't JSON — accept so it isn't retried forever.
      logger.warn("Paystack webhook: signed but unparseable body");
      return { event: "unknown", handled: false };
    }

    switch (event.event) {
      case "charge.success":
        await this.confirmCharge(event);
        return { event: event.event, handled: true };

      case "charge.failed":
      case "charge.abandoned": {
        const reference = event.data?.reference;
        if (reference) await paymentsRepository.markFailedByReference(reference);
        logger.info("Paystack charge not completed", { event: event.event });
        return { event: event.event, handled: true };
      }

      default:
        // Subscriptions, transfers, etc. — not part of the booking money path.
        return { event: event.event, handled: false };
    }
  },

  /** Confirm a `charge.success` event idempotently and emit side effects. */
  async confirmCharge(event: PaystackWebhookEvent): Promise<void> {
    const { reference, amount, id, paid_at: paidAtRaw } = event.data;
    const result = await paymentsRepository.confirmFromWebhook({
      reference,
      eventId: String(id),
      amountKobo: amount,
      paidAt: paidAtRaw ? new Date(paidAtRaw) : null,
    });

    switch (result.kind) {
      case "confirmed":
        await auditRepository.record({
          userId: result.payment.userId,
          action: "PAYMENT_CONFIRMED",
          entityType: "Booking",
          entityId: result.bookingId,
          metadata: { reference, amountKobo: amount },
        });
        await auditRepository.record({
          userId: result.payment.userId,
          action: "BOOKING_CONFIRMED",
          entityType: "Booking",
          entityId: result.bookingId,
          metadata: { via: "paystack_webhook" },
        });
        logger.info("Booking confirmed by payment", { bookingId: result.bookingId });
        // Post-commit side effects (§11): the booking is durably CONFIRMED, so it
        // is safe to fan out the confirmation email + push + realtime event.
        // Fire-and-forget — notification delivery must never fail a webhook ack,
        // and the service swallows its own errors.
        void notificationsService.sendBookingConfirmed(result.bookingId);
        return;

      case "already_success":
        // Replayed delivery — the unique/guarded claim already handled it. No-op.
        logger.debug("Paystack webhook replay ignored", { reference });
        return;

      case "no_payment":
        // A reference we never issued (stray/test event). Nothing to do.
        logger.warn("Paystack webhook for unknown reference", { reference });
        return;

      case "amount_mismatch":
        // Charged amount ≠ what we asked for. Do NOT confirm; flag for review.
        logger.error("Paystack amount mismatch — booking NOT confirmed", {
          reference,
          expectedKobo: result.expected,
          gotKobo: result.got,
        });
        await auditRepository.record({
          userId: null,
          action: "PAYMENT_AMOUNT_MISMATCH",
          entityType: "Payment",
          entityId: reference,
          metadata: { expectedKobo: result.expected, gotKobo: result.got },
        });
        return;

      case "paid_booking_not_pending":
        if (result.bookingStatus === "CONFIRMED") {
          // Benign: a concurrent delivery confirmed it first.
          logger.debug("Paystack webhook double-confirm ignored", { reference });
          return;
        }
        // Money captured but the slot was already released (expired/cancelled) —
        // needs a refund decision. Surfaced loudly, never silently dropped.
        logger.error("Payment captured on a non-pending booking — refund review needed", {
          bookingId: result.bookingId,
          bookingStatus: result.bookingStatus,
          reference,
        });
        await auditRepository.record({
          userId: result.payment.userId,
          action: "PAYMENT_ON_RELEASED_BOOKING",
          entityType: "Booking",
          entityId: result.bookingId,
          metadata: { reference, bookingStatus: result.bookingStatus },
        });
        return;
    }
  },
};
