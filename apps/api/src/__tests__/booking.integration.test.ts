import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../server";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { refreshTokenStore } from "../repositories/refreshTokenStore";
import { ERROR_CODES } from "@glamly/shared";

// End-to-end HTTP tests against the REAL Postgres + Redis. Hermetic via a
// per-run email namespace; all created rows are torn down in afterAll in
// FK-safe order (reviews → bookings → services → users[→stylist cascade]).

const RUN = `bktest_${Date.now()}`;
const password = "Sup3rSecret"; // upper+lower+digit, ≥8

let app: Express;
const createdUserIds = new Set<string>();
let stylistId = ""; // storefront id of the registered test stylist
let serviceId = ""; // a 60-min service belonging to that stylist
const SERVICE_DURATION = 60;
const SERVICE_PRICE = 12000;

// Tokens captured during setup.
let customerAToken = "";
let customerAId = "";
let customerBToken = "";
let stylistToken = "";

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

/** ISO start time for a future grid slot (UTC). dayOffset≥1 guarantees future. */
function slot(dayOffset: number, hour: number): string {
  const d = new Date();
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + dayOffset, hour, 0, 0, 0),
  ).toISOString();
}

async function register(
  role: "user" | "stylist",
  extra: Record<string, unknown> = {},
): Promise<{ token: string; id: string }> {
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

beforeAll(async () => {
  app = createApp();

  const a = await register("user", { name: "Customer A" });
  customerAToken = a.token;
  customerAId = a.id;

  const b = await register("user", { name: "Customer B" });
  customerBToken = b.token;

  const s = await register("stylist", {
    name: "Test Stylist",
    phone: "+2348012345678",
    specialty: "Makeup",
    location: "Lekki",
    priceFrom: 9000,
  });
  stylistToken = s.token;

  // Resolve the storefront id. Auto-approve so public routes return this stylist.
  const profile = await prisma.stylist.findUniqueOrThrow({ where: { userId: s.id } });
  stylistId = profile.id;
  await prisma.stylist.update({
    where: { id: stylistId },
    data: { status: "APPROVED", isVerified: true, approvedAt: new Date() },
  });
  const service = await prisma.service.create({
    data: {
      stylistId,
      name: "Glam Makeup",
      category: "Makeup",
      price: SERVICE_PRICE,
      duration: SERVICE_DURATION,
    },
  });
  serviceId = service.id;
});

afterAll(async () => {
  for (const id of createdUserIds) await refreshTokenStore.revokeAllForUser(id);
  await prisma.review.deleteMany({ where: { stylistId } });
  await prisma.booking.deleteMany({ where: { stylistId } });
  await prisma.service.deleteMany({ where: { stylistId } });
  await prisma.user.deleteMany({ where: { email: { contains: RUN } } });
  await prisma.$disconnect();
  redis.disconnect();
});

// ─── Stylists API ─────────────────────────────────────────────────────────────

describe("Stylists API", () => {
  it("lists stylists with pagination metadata", async () => {
    const res = await request(app).get("/api/v1/stylists?limit=5");
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeLessThanOrEqual(5);
    expect(res.body.data.meta).toMatchObject({ page: 1, limit: 5 });
    expect(res.body.data.meta.total).toBeGreaterThan(0);
  });

  it("filters by minRating (every result satisfies the floor)", async () => {
    const res = await request(app).get("/api/v1/stylists?minRating=4.5&limit=50");
    expect(res.status).toBe(200);
    for (const s of res.body.data.items) expect(s.rating).toBeGreaterThanOrEqual(4.5);
  });

  it("filters by availability", async () => {
    const res = await request(app).get("/api/v1/stylists?available=true&limit=50");
    expect(res.status).toBe(200);
    for (const s of res.body.data.items) expect(s.isAvailable).toBe(true);
  });

  it("filters by service category", async () => {
    const res = await request(app).get("/api/v1/stylists?category=Makeup&limit=50");
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });

  it("sorts by priceFrom ascending", async () => {
    const res = await request(app).get("/api/v1/stylists?sort=priceFrom&order=asc&limit=10");
    expect(res.status).toBe(200);
    const prices = res.body.data.items.map((s: { priceFrom: number }) => s.priceFrom);
    const sorted = [...prices].sort((x, y) => x - y);
    expect(prices).toEqual(sorted);
  });

  it("returns a detail with services, ratings summary, and availability", async () => {
    const res = await request(app).get(`/api/v1/stylists/${stylistId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(stylistId);
    expect(Array.isArray(res.body.data.services)).toBe(true);
    expect(res.body.data.ratingsSummary).toMatchObject({ count: expect.any(Number) });
    expect(res.body.data.availability).toHaveProperty("isAvailable");
  });

  it("404s for an unknown stylist", async () => {
    const res = await request(app).get("/api/v1/stylists/ckunknownunknownunknown00");
    expect(res.status).toBe(404);
  });

  it("returns available slots only", async () => {
    const res = await request(app).get(
      `/api/v1/stylists/${stylistId}/availability?serviceId=${serviceId}&days=2`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data.durationMinutes).toBe(SERVICE_DURATION);
    expect(Array.isArray(res.body.data.slots)).toBe(true);
    // Every returned slot is in the future.
    for (const s of res.body.data.slots) {
      expect(new Date(s.startTime).getTime()).toBeGreaterThan(Date.now());
    }
  });
});

// ─── Bookings API ─────────────────────────────────────────────────────────────

describe("Bookings API — lifecycle & ownership", () => {
  let bookingId = "";

  it("rejects an unauthenticated create (401)", async () => {
    const res = await request(app)
      .post("/api/v1/bookings")
      .send({ stylistId, serviceIds: [serviceId], startTime: slot(1, 9) });
    expect(res.status).toBe(401);
  });

  it("creates a booking for the authenticated customer (201)", async () => {
    const res = await request(app)
      .post("/api/v1/bookings")
      .set(auth(customerAToken))
      .send({ stylistId, serviceIds: [serviceId], startTime: slot(1, 9) });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("PENDING");
    expect(res.body.data.totalAmount).toBe(SERVICE_PRICE);
    expect(res.body.data.userId).toBe(customerAId);
    bookingId = res.body.data.id;
  });

  it("rejects a booking outside working hours (422)", async () => {
    const res = await request(app)
      .post("/api/v1/bookings")
      .set(auth(customerAToken))
      .send({ stylistId, serviceIds: [serviceId], startTime: slot(1, 3) }); // 03:00 — closed
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe(ERROR_CODES.BOOKING_SLOT_UNAVAILABLE);
  });

  it("rejects a booking in the past (422)", async () => {
    const res = await request(app)
      .post("/api/v1/bookings")
      .set(auth(customerAToken))
      .send({ stylistId, serviceIds: [serviceId], startTime: slot(-1, 10) });
    expect(res.status).toBe(422);
  });

  it("a STYLIST cannot create a booking (403)", async () => {
    const res = await request(app)
      .post("/api/v1/bookings")
      .set(auth(stylistToken))
      .send({ stylistId, serviceIds: [serviceId], startTime: slot(2, 10) });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe(ERROR_CODES.AUTH_FORBIDDEN);
  });

  it("lists the customer's own bookings", async () => {
    const res = await request(app).get("/api/v1/bookings/me").set(auth(customerAToken));
    expect(res.status).toBe(200);
    expect(res.body.data.view).toBe("customer");
    expect(res.body.data.items.some((b: { id: string }) => b.id === bookingId)).toBe(true);
  });

  it("shows the booking in the stylist's provider view", async () => {
    const res = await request(app).get("/api/v1/bookings/me").set(auth(stylistToken));
    expect(res.status).toBe(200);
    expect(res.body.data.view).toBe("provider");
    expect(res.body.data.items.some((b: { id: string }) => b.id === bookingId)).toBe(true);
  });

  it("forbids customer B from viewing A's booking (403)", async () => {
    const res = await request(app).get(`/api/v1/bookings/${bookingId}`).set(auth(customerBToken));
    expect(res.status).toBe(403);
  });

  it("forbids customer B from rescheduling A's booking (403)", async () => {
    const res = await request(app)
      .patch(`/api/v1/bookings/${bookingId}/reschedule`)
      .set(auth(customerBToken))
      .send({ startTime: slot(1, 13) });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe(ERROR_CODES.AUTH_FORBIDDEN);
  });

  it("forbids customer B from cancelling A's booking (403)", async () => {
    const res = await request(app)
      .patch(`/api/v1/bookings/${bookingId}/cancel`)
      .set(auth(customerBToken))
      .send({});
    expect(res.status).toBe(403);
  });

  it("lets the owner reschedule to a new free slot", async () => {
    const res = await request(app)
      .patch(`/api/v1/bookings/${bookingId}/reschedule`)
      .set(auth(customerAToken))
      .send({ startTime: slot(1, 11) });
    expect(res.status).toBe(200);
    expect(new Date(res.body.data.startTime).getUTCHours()).toBe(11);
  });

  it("lets the owner cancel, then rejects double-cancel (409)", async () => {
    const ok = await request(app)
      .patch(`/api/v1/bookings/${bookingId}/cancel`)
      .set(auth(customerAToken))
      .send({ reason: "changed my mind" });
    expect(ok.status).toBe(200);
    expect(ok.body.data.status).toBe("CANCELLED");

    const again = await request(app)
      .patch(`/api/v1/bookings/${bookingId}/cancel`)
      .set(auth(customerAToken))
      .send({});
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe(ERROR_CODES.BOOKING_INVALID_STATE);
  });

  it("cannot reschedule a cancelled booking (409)", async () => {
    const res = await request(app)
      .patch(`/api/v1/bookings/${bookingId}/reschedule`)
      .set(auth(customerAToken))
      .send({ startTime: slot(1, 12) });
    expect(res.status).toBe(409);
  });

  it("frees a cancelled slot for rebooking (partial unique index)", async () => {
    // bookingId above was cancelled at slot(1, 11) after reschedule — rebook it.
    const res = await request(app)
      .post("/api/v1/bookings")
      .set(auth(customerBToken))
      .send({ stylistId, serviceIds: [serviceId], startTime: slot(1, 11) });
    expect(res.status).toBe(201);
    // cleanup-friendly: cancel it so later slot math stays clear
    await request(app)
      .patch(`/api/v1/bookings/${res.body.data.id}/cancel`)
      .set(auth(customerBToken))
      .send({});
  });

  it("is idempotent for a repeated create with the same key", async () => {
    const key = `idem_${RUN}_${Math.random().toString(36).slice(2)}`;
    const body = { stylistId, serviceIds: [serviceId], startTime: slot(3, 9), idempotencyKey: key };

    const first = await request(app).post("/api/v1/bookings").set(auth(customerAToken)).send(body);
    expect(first.status).toBe(201);

    const second = await request(app).post("/api/v1/bookings").set(auth(customerAToken)).send(body);
    expect(second.status).toBe(200); // replay, not a new resource
    expect(second.body.data.id).toBe(first.body.data.id);

    await request(app)
      .patch(`/api/v1/bookings/${first.body.data.id}/cancel`)
      .set(auth(customerAToken))
      .send({});
  });
});

// ─── Double-booking protection ────────────────────────────────────────────────

describe("Double-booking protection", () => {
  it("allows exactly one of two concurrent bookings on the same slot", async () => {
    const startTime = slot(4, 14);
    const fire = (token: string) =>
      request(app).post("/api/v1/bookings").set(auth(token)).send({ stylistId, serviceIds: [serviceId], startTime });

    const [a, b] = await Promise.all([fire(customerAToken), fire(customerBToken)]);

    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([201, 409]); // one created, one rejected

    const loser = a.status === 409 ? a : b;
    expect(loser.body.error.code).toBe(ERROR_CODES.BOOKING_SLOT_TAKEN);

    // Exactly one ACTIVE booking exists for that slot in the DB.
    const active = await prisma.booking.count({
      where: { stylistId, startTime: new Date(startTime), status: { in: ["PENDING", "CONFIRMED"] } },
    });
    expect(active).toBe(1);
  });
});

// ─── Reviews API ──────────────────────────────────────────────────────────────

describe("Reviews API", () => {
  let completedBookingId = "";
  let pendingBookingId = "";

  beforeAll(async () => {
    // A booking we will complete (slot day 5, 09:00).
    const created = await request(app)
      .post("/api/v1/bookings")
      .set(auth(customerAToken))
      .send({ stylistId, serviceIds: [serviceId], startTime: slot(5, 9) });
    completedBookingId = created.body.data.id;

    // Provider (the stylist) marks it complete.
    const done = await request(app)
      .patch(`/api/v1/bookings/${completedBookingId}/complete`)
      .set(auth(stylistToken));
    expect(done.status).toBe(200);
    expect(done.body.data.status).toBe("COMPLETED");

    // A separate still-pending booking for the "review too early" case.
    const pending = await request(app)
      .post("/api/v1/bookings")
      .set(auth(customerAToken))
      .send({ stylistId, serviceIds: [serviceId], startTime: slot(5, 10) });
    pendingBookingId = pending.body.data.id;
  });

  it("rejects a review before the booking is completed (422)", async () => {
    const res = await request(app)
      .post("/api/v1/reviews")
      .set(auth(customerAToken))
      .send({ bookingId: pendingBookingId, rating: 5 });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe(ERROR_CODES.REVIEW_BOOKING_NOT_COMPLETED);
  });

  it("forbids customer B from reviewing A's booking (403)", async () => {
    const res = await request(app)
      .post("/api/v1/reviews")
      .set(auth(customerBToken))
      .send({ bookingId: completedBookingId, rating: 1 });
    expect(res.status).toBe(403);
  });

  it("lets the owner review a completed booking and updates the average", async () => {
    const res = await request(app)
      .post("/api/v1/reviews")
      .set(auth(customerAToken))
      .send({ bookingId: completedBookingId, rating: 4, comment: "Lovely work" });
    expect(res.status).toBe(201);
    expect(res.body.data.ratingsSummary).toMatchObject({ average: 4, count: 1 });
  });

  it("rejects a second review for the same booking (409)", async () => {
    const res = await request(app)
      .post("/api/v1/reviews")
      .set(auth(customerAToken))
      .send({ bookingId: completedBookingId, rating: 2 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(ERROR_CODES.REVIEW_ALREADY_EXISTS);
  });

  it("lists stylist reviews with summary and pagination", async () => {
    const res = await request(app).get(`/api/v1/stylists/${stylistId}/reviews`);
    expect(res.status).toBe(200);
    expect(res.body.data.ratingsSummary).toMatchObject({ average: 4, count: 1 });
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].rating).toBe(4);
    expect(res.body.data.meta).toMatchObject({ page: 1, total: 1 });
  });

  it("reflects the new average on the stylist detail", async () => {
    const res = await request(app).get(`/api/v1/stylists/${stylistId}`);
    expect(res.body.data.ratingsSummary).toMatchObject({ average: 4, count: 1 });
  });
});
