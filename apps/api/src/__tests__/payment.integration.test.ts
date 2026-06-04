import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../server";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { refreshTokenStore } from "../repositories/refreshTokenStore";
import { paystack } from "../integrations/paystack";
import { runExpireBookings } from "../jobs/expireBookings";
import { ERROR_CODES } from "@glamly/shared";

// End-to-end HTTP tests of the Paystack money path against REAL Postgres + Redis.
// The Paystack HTTP boundary (initializeTransaction) is stubbed; webhook signatures
// are forged with the real secret key via paystack.signPayload so signature
// verification and idempotency are exercised for real. A genuine Paystack-hosted
// checkout additionally needs live test keys + a public tunnel — out of scope here.

const RUN = `paytest_${Date.now()}`;
const password = "Sup3rSecret";
const SERVICE_PRICE = 12000; // naira
const AMOUNT_KOBO = SERVICE_PRICE * 100;

let app: Express;
const createdUserIds = new Set<string>();
let stylistId = "";
let serviceId = "";
let customerAToken = "";
let customerBToken = "";

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

function slot(dayOffset: number, hour: number): string {
  const d = new Date();
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + dayOffset, hour, 0, 0, 0),
  ).toISOString();
}

async function register(role: "user" | "stylist", extra: Record<string, unknown> = {}) {
  const res = await request(app)
    .post("/api/v1/auth/register")
    .send({
      role,
      name: extra.name ?? `${role} ${Math.random().toString(36).slice(2, 7)}`,
      email: `${RUN}_${role}_${Math.random().toString(36).slice(2, 8)}@glamly.test`,
      password,
      ...extra,
    });
  expect(res.status).toBe(201);
  createdUserIds.add(res.body.data.user.id);
  return { token: res.body.data.accessToken, id: res.body.data.user.id };
}

/** Create a fresh PENDING booking and return its id. */
async function createBooking(token: string, dayOffset: number, hour: number): Promise<string> {
  const res = await request(app)
    .post("/api/v1/bookings")
    .set(auth(token))
    .send({ stylistId, serviceIds: [serviceId], startTime: slot(dayOffset, hour) });
  expect(res.status).toBe(201);
  return res.body.data.id;
}

/** Initiate a checkout and return the generated Paystack reference. */
async function initiate(token: string, bookingId: string) {
  return request(app).post("/api/v1/payments/initiate").set(auth(token)).send({ bookingId });
}

/** POST a webhook event, signing the EXACT bytes we send with the secret key. */
function postWebhook(payload: unknown, opts: { signature?: string; sign?: boolean } = {}) {
  const raw = JSON.stringify(payload);
  const signature = opts.signature ?? (opts.sign === false ? undefined : paystack.signPayload(raw));
  const req = request(app)
    .post("/api/v1/payments/webhook")
    .set("Content-Type", "application/json");
  if (signature !== undefined) req.set("x-paystack-signature", signature);
  return req.send(raw);
}

function chargeSuccess(reference: string, overrides: Record<string, unknown> = {}) {
  return {
    event: "charge.success",
    data: {
      id: Date.now() + Math.floor(Math.random() * 1000),
      status: "success",
      reference,
      amount: AMOUNT_KOBO,
      currency: "NGN",
      paid_at: new Date().toISOString(),
      ...overrides,
    },
  };
}

beforeAll(async () => {
  app = createApp();

  // Stub only the Paystack HTTP boundary. Echo the reference back so the response
  // carries the real DB reference the service generated.
  vi.spyOn(paystack, "initializeTransaction").mockImplementation(async ({ reference }) => ({
    authorizationUrl: `https://checkout.paystack.test/${reference}`,
    accessCode: `acc_${reference}`,
    reference,
  }));

  const a = await register("user", { name: "Pay Customer A" });
  customerAToken = a.token;
  const b = await register("user", { name: "Pay Customer B" });
  customerBToken = b.token;

  const s = await register("stylist", {
    name: "Pay Stylist",
    phone: "+2348012345678",
    specialty: "Makeup",
    location: "Lekki",
    priceFrom: 9000,
  });
  const profile = await prisma.stylist.findUniqueOrThrow({ where: { userId: s.id } });
  stylistId = profile.id;
  await prisma.stylist.update({
    where: { id: stylistId },
    data: { status: "APPROVED", isVerified: true, approvedAt: new Date() },
  });
  const service = await prisma.service.create({
    data: { stylistId, name: "Glam Makeup", category: "Makeup", price: SERVICE_PRICE, duration: 60 },
  });
  serviceId = service.id;
});

afterAll(async () => {
  vi.restoreAllMocks();
  for (const id of createdUserIds) await refreshTokenStore.revokeAllForUser(id);
  await prisma.payment.deleteMany({ where: { booking: { stylistId } } });
  await prisma.booking.deleteMany({ where: { stylistId } });
  await prisma.service.deleteMany({ where: { stylistId } });
  await prisma.user.deleteMany({ where: { email: { contains: RUN } } });
  await prisma.$disconnect();
  redis.disconnect();
});

// ─── Initiation ───────────────────────────────────────────────────────────────

describe("POST /payments/initiate", () => {
  it("creates a PENDING payment and returns a checkout URL", async () => {
    const bookingId = await createBooking(customerAToken, 1, 9);
    const res = await initiate(customerAToken, bookingId);

    expect(res.status).toBe(200);
    expect(res.body.data.authorizationUrl).toContain("https://checkout.paystack.test/");
    expect(typeof res.body.data.reference).toBe("string");

    const payment = await prisma.payment.findUnique({ where: { bookingId } });
    expect(payment).not.toBeNull();
    expect(payment!.status).toBe("PENDING");
    expect(payment!.amount).toBe(AMOUNT_KOBO); // stored in kobo
    expect(payment!.paystackRef).toBe(res.body.data.reference);
  });

  it("re-initiating a pending payment re-arms the same row with a fresh reference", async () => {
    const bookingId = await createBooking(customerAToken, 1, 10);
    const first = await initiate(customerAToken, bookingId);
    const second = await initiate(customerAToken, bookingId);
    expect(second.status).toBe(200);

    // A retry mints a NEW reference — Paystack rejects re-initializing with a
    // reference it has already seen, so reuse is unreliable. The idempotency that
    // matters is at the row level: the booking still maps to exactly ONE payment
    // row (re-armed in place), so the customer can never be double-charged.
    expect(second.body.data.reference).not.toBe(first.body.data.reference);

    const payments = await prisma.payment.findMany({ where: { bookingId } });
    expect(payments).toHaveLength(1);
    expect(payments[0]!.status).toBe("PENDING");
    expect(payments[0]!.paystackRef).toBe(second.body.data.reference);
  });

  it("forbids paying for another customer's booking (403)", async () => {
    const bookingId = await createBooking(customerAToken, 1, 11);
    const res = await initiate(customerBToken, bookingId);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe(ERROR_CODES.AUTH_FORBIDDEN);
  });

  it("rejects paying for a cancelled booking (409)", async () => {
    const bookingId = await createBooking(customerAToken, 1, 12);
    await request(app).patch(`/api/v1/bookings/${bookingId}/cancel`).set(auth(customerAToken)).send({});
    const res = await initiate(customerAToken, bookingId);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(ERROR_CODES.PAYMENT_BOOKING_NOT_PAYABLE);
  });
});

// ─── Webhook signature verification ───────────────────────────────────────────

describe("POST /payments/webhook — signature", () => {
  it("rejects a missing signature (400)", async () => {
    const res = await postWebhook(chargeSuccess("glamly-nope"), { sign: false });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(ERROR_CODES.PAYMENT_SIGNATURE_INVALID);
  });

  it("rejects a tampered signature (400)", async () => {
    const res = await postWebhook(chargeSuccess("glamly-nope"), { signature: "deadbeef" });
    expect(res.status).toBe(400);
  });

  it("rejects a body that doesn't match its signature (400)", async () => {
    // Sign one payload, send a different one.
    const goodSig = paystack.signPayload(JSON.stringify(chargeSuccess("ref-a")));
    const res = await postWebhook(chargeSuccess("ref-b"), { signature: goodSig });
    expect(res.status).toBe(400);
  });

  it("accepts a validly signed unknown-reference event without side effects (200)", async () => {
    const res = await postWebhook(chargeSuccess("glamly-does-not-exist-12345"));
    expect(res.status).toBe(200);
    expect(res.body.data.handled).toBe(true);
  });

  it("ignores an unrelated event type (200, handled:false)", async () => {
    const res = await postWebhook({ event: "transfer.success", data: { reference: "x" } });
    expect(res.status).toBe(200);
    expect(res.body.data.handled).toBe(false);
  });
});

// ─── The money path: confirm only via signed webhook ──────────────────────────

describe("Webhook confirmation (PENDING → CONFIRMED)", () => {
  it("confirms the booking and marks the payment SUCCESS", async () => {
    const bookingId = await createBooking(customerAToken, 2, 9);
    const { body } = await initiate(customerAToken, bookingId);
    const reference: string = body.data.reference;

    // Booking is PENDING before the webhook (client callback never confirms).
    const before = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(before.status).toBe("PENDING");

    const res = await postWebhook(chargeSuccess(reference));
    expect(res.status).toBe(200);
    expect(res.body.data.handled).toBe(true);

    const after = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(after.status).toBe("CONFIRMED");
    const payment = await prisma.payment.findUniqueOrThrow({ where: { bookingId } });
    expect(payment.status).toBe("SUCCESS");
    expect(payment.paidAt).not.toBeNull();
    expect(payment.paystackEventId).not.toBeNull();
  });

  it("is idempotent — replaying the same event does not double-confirm or change state", async () => {
    const bookingId = await createBooking(customerAToken, 2, 10);
    const { body } = await initiate(customerAToken, bookingId);
    const event = chargeSuccess(body.data.reference);

    const first = await postWebhook(event);
    expect(first.status).toBe(200);
    const afterFirst = await prisma.payment.findUniqueOrThrow({ where: { bookingId } });

    // Replay the IDENTICAL signed event twice more.
    const second = await postWebhook(event);
    const third = await postWebhook(event);
    expect(second.status).toBe(200);
    expect(third.status).toBe(200);

    const afterReplays = await prisma.payment.findUniqueOrThrow({ where: { bookingId } });
    expect(afterReplays.status).toBe("SUCCESS");
    expect(afterReplays.paystackEventId).toBe(afterFirst.paystackEventId);
    expect(afterReplays.paidAt?.getTime()).toBe(afterFirst.paidAt?.getTime());

    // Exactly one CONFIRMED booking, never duplicated.
    const confirmed = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(confirmed.status).toBe("CONFIRMED");

    // Only ONE PAYMENT_CONFIRMED audit row despite three deliveries.
    const audits = await prisma.auditLog.count({
      where: { entityId: bookingId, action: "PAYMENT_CONFIRMED" },
    });
    expect(audits).toBe(1);
  });

  it("survives two concurrent identical deliveries (one confirm, no error)", async () => {
    const bookingId = await createBooking(customerAToken, 2, 11);
    const { body } = await initiate(customerAToken, bookingId);
    const event = chargeSuccess(body.data.reference);

    const [a, b] = await Promise.all([postWebhook(event), postWebhook(event)]);
    expect([a.status, b.status]).toEqual([200, 200]);

    const confirmed = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(confirmed.status).toBe("CONFIRMED");
    const audits = await prisma.auditLog.count({
      where: { entityId: bookingId, action: "PAYMENT_CONFIRMED" },
    });
    expect(audits).toBe(1);
  });

  it("does NOT confirm when the charged amount differs from the booking total", async () => {
    const bookingId = await createBooking(customerAToken, 2, 12);
    const { body } = await initiate(customerAToken, bookingId);

    const res = await postWebhook(chargeSuccess(body.data.reference, { amount: AMOUNT_KOBO - 5000 }));
    expect(res.status).toBe(200); // acknowledged, but...

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.status).toBe("PENDING"); // ...never confirmed on a wrong amount
    const payment = await prisma.payment.findUniqueOrThrow({ where: { bookingId } });
    expect(payment.status).toBe("PENDING");

    const flagged = await prisma.auditLog.count({
      where: { entityId: body.data.reference, action: "PAYMENT_AMOUNT_MISMATCH" },
    });
    expect(flagged).toBe(1);
  });
});

// ─── Read-only status endpoint ────────────────────────────────────────────────

describe("GET /payments/:reference", () => {
  it("returns the owner's payment status and 404s for everyone else", async () => {
    const bookingId = await createBooking(customerAToken, 3, 9);
    const { body } = await initiate(customerAToken, bookingId);
    const reference: string = body.data.reference;

    const mine = await request(app).get(`/api/v1/payments/${reference}`).set(auth(customerAToken));
    expect(mine.status).toBe(200);
    expect(mine.body.data.status).toBe("PENDING");
    expect(mine.body.data.amount).toBe(AMOUNT_KOBO);

    // A different customer can't see (or even confirm the existence of) it.
    const theirs = await request(app).get(`/api/v1/payments/${reference}`).set(auth(customerBToken));
    expect(theirs.status).toBe(404);
  });
});

// ─── Auto-expiry of unpaid bookings ───────────────────────────────────────────

describe("expireBookings job", () => {
  it("cancels an unpaid booking older than the window and fails its payment", async () => {
    const bookingId = await createBooking(customerAToken, 4, 9);
    await initiate(customerAToken, bookingId); // PENDING payment

    // Backdate creation past the 30-minute window.
    await prisma.booking.update({
      where: { id: bookingId },
      data: { createdAt: new Date(Date.now() - 31 * 60_000) },
    });

    const { expired } = await runExpireBookings();
    expect(expired).toBeGreaterThanOrEqual(1);

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.status).toBe("CANCELLED");
    expect(booking.cancellationReason).toMatch(/payment/i);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { bookingId } });
    expect(payment.status).toBe("FAILED");
  });

  it("leaves a fresh (within-window) PENDING booking untouched", async () => {
    const bookingId = await createBooking(customerAToken, 4, 10);
    await runExpireBookings();
    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.status).toBe("PENDING");
  });

  it("never expires a CONFIRMED booking, even an old one", async () => {
    const bookingId = await createBooking(customerAToken, 4, 11);
    const { body } = await initiate(customerAToken, bookingId);
    await postWebhook(chargeSuccess(body.data.reference)); // → CONFIRMED
    await prisma.booking.update({
      where: { id: bookingId },
      data: { createdAt: new Date(Date.now() - 60 * 60_000) },
    });

    await runExpireBookings();
    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.status).toBe("CONFIRMED");
  });

  it("confirms a late webhook even near the window; the expiry guard prevents a double transition", async () => {
    // Models the race: a paid webhook arriving for a booking the job also targets.
    // The guarded updateMany means exactly one transition wins.
    const bookingId = await createBooking(customerAToken, 4, 12);
    const { body } = await initiate(customerAToken, bookingId);

    // Confirm first, THEN run expiry against a backdated row — must stay CONFIRMED.
    await postWebhook(chargeSuccess(body.data.reference));
    await prisma.booking.update({
      where: { id: bookingId },
      data: { createdAt: new Date(Date.now() - 31 * 60_000) },
    });
    await runExpireBookings();

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.status).toBe("CONFIRMED");
    const payment = await prisma.payment.findUniqueOrThrow({ where: { bookingId } });
    expect(payment.status).toBe("SUCCESS");
  });
});

// ─── Direct signature-unit coverage ───────────────────────────────────────────

describe("paystack.verifyWebhookSignature", () => {
  it("accepts a correct HMAC and rejects everything else", () => {
    const body = JSON.stringify({ hello: "world" });
    const sig = paystack.signPayload(body);
    expect(paystack.verifyWebhookSignature(body, sig)).toBe(true);
    expect(paystack.verifyWebhookSignature(body, undefined)).toBe(false);
    expect(paystack.verifyWebhookSignature(body, "short")).toBe(false); // length mismatch
    expect(paystack.verifyWebhookSignature(body + " ", sig)).toBe(false); // body changed
  });
});
