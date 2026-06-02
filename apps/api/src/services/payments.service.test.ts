import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES, ROLES } from "@glamly/shared";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("../repositories/payments.repository", () => {
  interface FakePayment {
    id: string;
    bookingId: string;
    userId: string;
    amount: number;
    currency: string;
    status: string;
    paystackRef: string | null;
    paystackEventId: string | null;
    paidAt: Date | null;
  }

  const byBookingId = new Map<string, FakePayment>();
  const byRef = new Map<string, FakePayment>();
  let seq = 0;

  return {
    __store: { byBookingId, byRef },
    paymentsRepository: {
      findByBookingId: vi.fn(async (bookingId: string) => {
        const p = byBookingId.get(bookingId);
        return p ? { ...p } : null;
      }),
      findByReference: vi.fn(async (ref: string) => {
        const p = byRef.get(ref);
        return p ? { ...p } : null;
      }),
      createPending: vi.fn(
        async (data: {
          bookingId: string;
          userId: string;
          amountKobo: number;
          currency: string;
          reference: string;
        }) => {
          const p: FakePayment = {
            id: `pay_${++seq}`,
            bookingId: data.bookingId,
            userId: data.userId,
            amount: data.amountKobo,
            currency: data.currency,
            status: "PENDING",
            paystackRef: data.reference,
            paystackEventId: null,
            paidAt: null,
          };
          byBookingId.set(data.bookingId, p);
          byRef.set(data.reference, p);
          return { ...p };
        },
      ),
      reinitialize: vi.fn(async (id: string, reference: string, amountKobo: number) => {
        for (const [, p] of byBookingId) {
          if (p.id === id) {
            if (p.paystackRef) byRef.delete(p.paystackRef);
            p.paystackRef = reference;
            p.amount = amountKobo;
            p.status = "PENDING";
            p.paystackEventId = null;
            p.paidAt = null;
            byRef.set(reference, p);
            return { ...p };
          }
        }
        return null;
      }),
      confirmFromWebhook: vi.fn(async () => ({ kind: "confirmed", bookingId: "bk_1", payment: {} })),
      markFailedByReference: vi.fn(async () => {}),
    },
  };
});

vi.mock("../repositories/bookings.repository", () => {
  const store = new Map<string, { id: string; userId: string; stylistId: string; status: string; totalAmount: number }>([
    ["bk_1", { id: "bk_1", userId: "user_1", stylistId: "st_1", status: "PENDING", totalAmount: 5000 }],
    ["bk_confirmed", { id: "bk_confirmed", userId: "user_1", stylistId: "st_1", status: "CONFIRMED", totalAmount: 5000 }],
    ["bk_cancelled", { id: "bk_cancelled", userId: "user_1", stylistId: "st_1", status: "CANCELLED", totalAmount: 5000 }],
  ]);
  return {
    bookingsRepository: {
      findById: vi.fn(async (id: string) => {
        const b = store.get(id);
        return b ? { ...b } : null;
      }),
    },
  };
});

vi.mock("../repositories/auth.repository", () => ({
  authRepository: {
    findActiveById: vi.fn(async (id: string) =>
      id === "user_1"
        ? { id: "user_1", email: "user@test.com", name: "Ada", role: ROLES.USER }
        : null,
    ),
  },
}));

vi.mock("../repositories/audit.repository", () => ({
  auditRepository: { record: vi.fn(async () => {}) },
}));

vi.mock("./notifications.service", () => ({
  notificationsService: {
    sendBookingConfirmed: vi.fn(async () => {}),
  },
}));

vi.mock("../integrations/paystack", () => {
  const FAKE_SECRET = "test_secret_key";

  function sign(rawBody: Buffer): string {
    return crypto.createHmac("sha512", FAKE_SECRET).update(rawBody).digest("hex");
  }

  return {
    PaystackApiError: class PaystackApiError extends Error {
      constructor(msg: string) {
        super(msg);
        this.name = "PaystackApiError";
      }
    },
    paystack: {
      initializeTransaction: vi.fn(async () => ({
        authorizationUrl: "https://paystack.test/pay/abc",
        accessCode: "acc_abc",
        reference: "glamly-bk_1-deadbeef",
      })),
      verifyWebhookSignature: vi.fn((rawBody: Buffer, sig: string | undefined): boolean => {
        if (!sig) return false;
        const expected = sign(rawBody);
        return sig === expected;
      }),
    },
  };
});

vi.mock("../config", () => ({
  config: {
    PAYSTACK_SECRET_KEY: "test_secret_key",
    PAYSTACK_BASE_URL: "https://api.paystack.co",
    PAYSTACK_CALLBACK_URL: "http://localhost:3000/payment/callback",
  },
}));

// ── Imports (after mocks) ──────────────────────────────────────────────────────
import { paymentsService } from "./payments.service";
import { paymentsRepository } from "../repositories/payments.repository";
import * as paymentsRepoMod from "../repositories/payments.repository";
import { notificationsService } from "./notifications.service";
import { auditRepository } from "../repositories/audit.repository";

const repoStore = (
  paymentsRepoMod as unknown as {
    __store: { byBookingId: Map<string, unknown>; byRef: Map<string, unknown> };
  }
).__store;

const CUSTOMER = { userId: "user_1", role: ROLES.USER };
const ADMIN = { userId: "admin_1", role: ROLES.ADMIN };
const OTHER = { userId: "other_user", role: ROLES.USER };

function makeWebhookBody(event: string, data: Record<string, unknown>): Buffer {
  return Buffer.from(JSON.stringify({ event, data }), "utf8");
}

function signBody(body: Buffer): string {
  return crypto.createHmac("sha512", "test_secret_key").update(body).digest("hex");
}

beforeEach(() => {
  repoStore.byBookingId.clear();
  repoStore.byRef.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ── paymentsService.initiate ──────────────────────────────────────────────────

describe("paymentsService.initiate", () => {
  it("creates a payment row and returns a checkout URL", async () => {
    const result = await paymentsService.initiate(CUSTOMER, { bookingId: "bk_1" });
    expect(result.authorizationUrl).toContain("paystack.test");
    expect(paymentsRepository.createPending).toHaveBeenCalledTimes(1);
  });

  it("reuses the existing PENDING reference on idempotent retry", async () => {
    await paymentsService.initiate(CUSTOMER, { bookingId: "bk_1" });
    const second = await paymentsService.initiate(CUSTOMER, { bookingId: "bk_1" });
    expect(second.authorizationUrl).toBeDefined();
    // Payment was created only once; second call found the existing PENDING row.
    expect(paymentsRepository.createPending).toHaveBeenCalledTimes(1);
  });

  it("throws FORBIDDEN when another user tries to pay for someone else's booking", async () => {
    await expect(
      paymentsService.initiate(OTHER, { bookingId: "bk_1" }),
    ).rejects.toMatchObject({ code: ERROR_CODES.AUTH_FORBIDDEN });
  });

  it("throws PAYMENT_BOOKING_NOT_PAYABLE for a non-PENDING booking", async () => {
    await expect(
      paymentsService.initiate(CUSTOMER, { bookingId: "bk_confirmed" }),
    ).rejects.toMatchObject({ code: ERROR_CODES.PAYMENT_BOOKING_NOT_PAYABLE });
  });

  it("throws BOOKING_NOT_FOUND for an unknown booking", async () => {
    await expect(
      paymentsService.initiate(CUSTOMER, { bookingId: "bk_unknown" }),
    ).rejects.toMatchObject({ code: ERROR_CODES.BOOKING_NOT_FOUND });
  });

  it("throws PAYMENT_BOOKING_NOT_PAYABLE when the payment is already SUCCESS", async () => {
    // Manually seed a SUCCESS payment row.
    repoStore.byBookingId.set("bk_1", {
      id: "pay_done",
      bookingId: "bk_1",
      userId: "user_1",
      amount: 500000,
      currency: "NGN",
      status: "SUCCESS",
      paystackRef: "glamly-bk_1-done",
      paystackEventId: null,
      paidAt: new Date(),
    });

    await expect(
      paymentsService.initiate(CUSTOMER, { bookingId: "bk_1" }),
    ).rejects.toMatchObject({ code: ERROR_CODES.PAYMENT_BOOKING_NOT_PAYABLE });
  });

  it("re-arms a FAILED payment with a new reference", async () => {
    repoStore.byBookingId.set("bk_1", {
      id: "pay_failed",
      bookingId: "bk_1",
      userId: "user_1",
      amount: 500000,
      currency: "NGN",
      status: "FAILED",
      paystackRef: "glamly-bk_1-old",
      paystackEventId: null,
      paidAt: null,
    });

    const result = await paymentsService.initiate(CUSTOMER, { bookingId: "bk_1" });
    expect(result.authorizationUrl).toBeDefined();
    expect(paymentsRepository.reinitialize).toHaveBeenCalledTimes(1);
  });

  it("allows an ADMIN to initiate payment on behalf of any booking", async () => {
    const result = await paymentsService.initiate(ADMIN, { bookingId: "bk_1" });
    expect(result.authorizationUrl).toBeDefined();
  });
});

// ── paymentsService.getStatusForActor ────────────────────────────────────────

describe("paymentsService.getStatusForActor", () => {
  it("returns the payment status for the owning customer", async () => {
    await paymentsService.initiate(CUSTOMER, { bookingId: "bk_1" });
    const ref = (repoStore.byBookingId.get("bk_1") as { paystackRef: string }).paystackRef;

    const status = await paymentsService.getStatusForActor(CUSTOMER, ref);
    expect(status.bookingId).toBe("bk_1");
    expect(status.status).toBe("PENDING");
  });

  it("throws PAYMENT_NOT_FOUND for a reference owned by another user", async () => {
    await paymentsService.initiate(CUSTOMER, { bookingId: "bk_1" });
    const ref = (repoStore.byBookingId.get("bk_1") as { paystackRef: string }).paystackRef;

    await expect(
      paymentsService.getStatusForActor(OTHER, ref),
    ).rejects.toMatchObject({ code: ERROR_CODES.PAYMENT_NOT_FOUND });
  });

  it("throws PAYMENT_NOT_FOUND for an unknown reference", async () => {
    await expect(
      paymentsService.getStatusForActor(CUSTOMER, "unknown_ref"),
    ).rejects.toMatchObject({ code: ERROR_CODES.PAYMENT_NOT_FOUND });
  });
});

// ── paymentsService.handleWebhook ─────────────────────────────────────────────

describe("paymentsService.handleWebhook", () => {
  it("rejects a missing signature with PAYMENT_SIGNATURE_INVALID", async () => {
    const body = makeWebhookBody("charge.success", { reference: "ref_1", amount: 500000, id: 99, paid_at: null });
    await expect(
      paymentsService.handleWebhook(body, undefined),
    ).rejects.toMatchObject({ code: ERROR_CODES.PAYMENT_SIGNATURE_INVALID });
  });

  it("rejects a tampered body (signature mismatch)", async () => {
    const body = makeWebhookBody("charge.success", { reference: "ref_1", amount: 500000, id: 99, paid_at: null });
    const sig = signBody(body);
    const tampered = Buffer.from(JSON.stringify({ event: "charge.success", data: { reference: "ref_X" } }));

    await expect(
      paymentsService.handleWebhook(tampered, sig),
    ).rejects.toMatchObject({ code: ERROR_CODES.PAYMENT_SIGNATURE_INVALID });
  });

  it("handles charge.success and calls confirmFromWebhook", async () => {
    const data = { reference: "ref_1", amount: 500000, id: 42, paid_at: null };
    const body = makeWebhookBody("charge.success", data);
    const sig = signBody(body);

    const result = await paymentsService.handleWebhook(body, sig);
    expect(result.event).toBe("charge.success");
    expect(result.handled).toBe(true);
    expect(paymentsRepository.confirmFromWebhook).toHaveBeenCalledTimes(1);
  });

  it("handles charge.failed by marking the payment failed", async () => {
    const data = { reference: "ref_2", amount: 0, id: 43, paid_at: null };
    const body = makeWebhookBody("charge.failed", data);
    const sig = signBody(body);

    const result = await paymentsService.handleWebhook(body, sig);
    expect(result.event).toBe("charge.failed");
    expect(result.handled).toBe(true);
    expect(paymentsRepository.markFailedByReference).toHaveBeenCalledWith("ref_2");
  });

  it("acknowledges unhandled events without side effects", async () => {
    const data = { reference: "ref_3", amount: 0, id: 44, paid_at: null };
    const body = makeWebhookBody("subscription.create", data);
    const sig = signBody(body);

    const result = await paymentsService.handleWebhook(body, sig);
    expect(result.handled).toBe(false);
    expect(paymentsRepository.confirmFromWebhook).not.toHaveBeenCalled();
  });

  it("accepts a signed but non-JSON body gracefully (no throw)", async () => {
    const body = Buffer.from("not-json", "utf8");
    const sig = signBody(body);

    const result = await paymentsService.handleWebhook(body, sig);
    expect(result.handled).toBe(false);
  });
});

// ── paymentsService.confirmCharge ─────────────────────────────────────────────

describe("paymentsService.confirmCharge", () => {
  it("records audit and sends notification on 'confirmed' outcome", async () => {
    (paymentsRepository.confirmFromWebhook as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      kind: "confirmed",
      bookingId: "bk_1",
      payment: { id: "pay_1", userId: "user_1" },
    });

    await paymentsService.confirmCharge({ event: "charge.success", data: { id: 1, reference: "ref_1", amount: 500000, currency: "NGN", paid_at: null, status: "success" } });
    expect(auditRepository.record).toHaveBeenCalled();
    expect(notificationsService.sendBookingConfirmed).toHaveBeenCalledWith("bk_1");
  });

  it("is a no-op on 'already_success' (idempotent replay)", async () => {
    (paymentsRepository.confirmFromWebhook as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      kind: "already_success",
      payment: { id: "pay_1" },
    });

    await paymentsService.confirmCharge({ event: "charge.success", data: { id: 1, reference: "ref_1", amount: 500000, currency: "NGN", paid_at: null, status: "success" } });
    expect(notificationsService.sendBookingConfirmed).not.toHaveBeenCalled();
  });

  it("is a no-op on 'no_payment' (stray reference)", async () => {
    (paymentsRepository.confirmFromWebhook as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      kind: "no_payment",
    });

    await paymentsService.confirmCharge({ event: "charge.success", data: { id: 1, reference: "ref_unknown", amount: 500000, currency: "NGN", paid_at: null, status: "success" } });
    expect(auditRepository.record).not.toHaveBeenCalled();
    expect(notificationsService.sendBookingConfirmed).not.toHaveBeenCalled();
  });

  it("records audit for 'amount_mismatch' and does NOT confirm", async () => {
    (paymentsRepository.confirmFromWebhook as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      kind: "amount_mismatch",
      expected: 500000,
      got: 100,
    });

    await paymentsService.confirmCharge({ event: "charge.success", data: { id: 1, reference: "ref_mismatch", amount: 100, currency: "NGN", paid_at: null, status: "success" } });
    expect(auditRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "PAYMENT_AMOUNT_MISMATCH" }),
    );
    expect(notificationsService.sendBookingConfirmed).not.toHaveBeenCalled();
  });

  it("records audit for 'paid_booking_not_pending' when booking is CANCELLED", async () => {
    (paymentsRepository.confirmFromWebhook as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      kind: "paid_booking_not_pending",
      bookingId: "bk_1",
      bookingStatus: "CANCELLED",
      payment: { id: "pay_1", userId: "user_1" },
    });

    await paymentsService.confirmCharge({ event: "charge.success", data: { id: 1, reference: "ref_1", amount: 500000, currency: "NGN", paid_at: null, status: "success" } });
    expect(auditRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "PAYMENT_ON_RELEASED_BOOKING" }),
    );
    expect(notificationsService.sendBookingConfirmed).not.toHaveBeenCalled();
  });

  it("ignores 'paid_booking_not_pending' gracefully when booking is already CONFIRMED", async () => {
    (paymentsRepository.confirmFromWebhook as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      kind: "paid_booking_not_pending",
      bookingId: "bk_1",
      bookingStatus: "CONFIRMED",
      payment: { id: "pay_1", userId: "user_1" },
    });

    await paymentsService.confirmCharge({ event: "charge.success", data: { id: 1, reference: "ref_1", amount: 500000, currency: "NGN", paid_at: null, status: "success" } });
    // CONFIRMED is a benign double-confirm; no audit, no notification.
    expect(auditRepository.record).not.toHaveBeenCalled();
    expect(notificationsService.sendBookingConfirmed).not.toHaveBeenCalled();
  });
});
