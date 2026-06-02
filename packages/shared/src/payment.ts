import { z } from "zod";

// ─── Payment status vocabulary ────────────────────────────────────────────────
//
// Mirrors the Prisma `PaymentStatus` enum exactly (the DB is the source of
// truth). A payment is created PENDING at checkout initiation and only ever
// moves to SUCCESS via a signature-verified Paystack webhook (CLAUDE.md §6) —
// never on the client-side redirect callback.

export const PAYMENT_STATUSES = ["PENDING", "SUCCESS", "FAILED", "REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

// ─── Money units ──────────────────────────────────────────────────────────────
//
// Service/booking amounts are stored in whole Naira (e.g. ₦12,000 → 12000).
// Paystack transacts in kobo, the Naira minor unit, and every amount in its API
// (init request, webhook payload, verify response) is an integer number of kobo.
// `Payment.amount` is therefore persisted in KOBO so it compares byte-for-byte
// with the webhook's `data.amount` — no floating-point division on the money path.

export const NAIRA_TO_KOBO = 100;

/** Convert whole Naira to integer kobo for Paystack. */
export function nairaToKobo(naira: number): number {
  return Math.round(naira * NAIRA_TO_KOBO);
}

// ─── Auto-expiry ──────────────────────────────────────────────────────────────
//
// An unpaid (PENDING) booking holds its slot. To stop abandoned checkouts from
// blocking a slot forever, a background job cancels any booking still PENDING
// this many minutes after creation (CLAUDE.md §11 race handling in the job).

export const BOOKING_PAYMENT_EXPIRY_MINUTES = 30;

// ─── Request schemas ──────────────────────────────────────────────────────────

export const initiatePaymentSchema = z.object({
  bookingId: z.string().cuid(),
});
export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;

/** Param schema for `GET /payments/:reference` (read-only status lookup). */
export const paymentReferenceParamSchema = z.object({
  // Paystack references are opaque ASCII; we generate them, so keep this strict.
  reference: z.string().min(8).max(100),
});
export type PaymentReferenceParam = z.infer<typeof paymentReferenceParamSchema>;

// ─── Response shapes ──────────────────────────────────────────────────────────

export interface InitiatePaymentResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export interface PaymentStatusResult {
  reference: string;
  bookingId: string;
  amount: number; // kobo
  currency: string;
  status: PaymentStatus;
  paidAt: string | null;
}
