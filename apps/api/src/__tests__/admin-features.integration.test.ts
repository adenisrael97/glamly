import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../server";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { refreshTokenStore } from "../repositories/refreshTokenStore";

// End-to-end HTTP tests for the admin / stylist-self-management / multi-service
// booking / gift-voucher features added in this phase. Runs against the REAL
// Postgres + Redis; all created rows are torn down in afterAll.

const RUN = `adminfeat_${Date.now()}`;
const password = "Sup3rSecret";

let app: Express;
const createdUserIds = new Set<string>();
let adminToken = "";
let adminId = "";
let stylistToken = "";
let stylistUserId = "";
let stylistId = "";
let svcAId = "";
let svcBId = "";
let customerToken = "";

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
  return { token: res.body.data.accessToken as string, id: res.body.data.user.id as string };
}

beforeAll(async () => {
  app = createApp();

  // Admin: register a user then promote to ADMIN directly in the DB.
  const a = await register("user", { name: "Feat Admin" });
  adminToken = a.token;
  adminId = a.id;
  await prisma.user.update({ where: { id: adminId }, data: { role: "ADMIN" } });
  // Re-login so the JWT carries the ADMIN role.
  const adminLogin = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: (await prisma.user.findUniqueOrThrow({ where: { id: adminId } })).email, password });
  adminToken = adminLogin.body.data.accessToken;

  // Stylist: register (starts PENDING_APPROVAL), capture ids.
  const s = await register("stylist", {
    name: "Feat Stylist",
    phone: "+2348012345000",
    specialty: "Makeup",
    location: "Lekki",
    priceFrom: 9000,
  });
  stylistToken = s.token;
  stylistUserId = s.id;
  const stylistRow = await prisma.stylist.findUniqueOrThrow({ where: { userId: stylistUserId } });
  stylistId = stylistRow.id;

  // Customer with address/phone for the PII-visibility assertion.
  const c = await register("user", { name: "Feat Customer" });
  customerToken = c.token;
  await prisma.user.update({
    where: { id: c.id },
    data: { phone: "+2348099000111", address: "9 Test Close, Lekki" },
  });
});

afterAll(async () => {
  for (const id of createdUserIds) await refreshTokenStore.revokeAllForUser(id);
  await prisma.giftVoucherService.deleteMany({ where: { giftVoucher: { purchasedBy: { email: { contains: RUN } } } } });
  await prisma.giftVoucher.deleteMany({ where: { purchasedBy: { email: { contains: RUN } } } });
  await prisma.bookingService.deleteMany({ where: { booking: { stylistId } } });
  await prisma.booking.deleteMany({ where: { stylistId } });
  await prisma.packageService.deleteMany({ where: { package: { stylistId } } });
  await prisma.package.deleteMany({ where: { stylistId } });
  await prisma.service.deleteMany({ where: { stylistId } });
  await prisma.auditLog.deleteMany({ where: { userId: { in: [...createdUserIds] } } });
  await prisma.user.deleteMany({ where: { email: { contains: RUN } } });
  await prisma.$disconnect();
  redis.disconnect();
});

// ─── Admin: RBAC ────────────────────────────────────────────────────────────────

describe("admin RBAC", () => {
  it("non-admin (stylist) is rejected with 403", async () => {
    const res = await request(app).get("/api/v1/admin/stylists").set(auth(stylistToken));
    expect(res.status).toBe(403);
  });

  it("non-admin (customer) is rejected with 403 on analytics", async () => {
    const res = await request(app).get("/api/v1/admin/analytics").set(auth(customerToken));
    expect(res.status).toBe(403);
  });

  it("unauthenticated is rejected with 401", async () => {
    const res = await request(app).get("/api/v1/admin/stylists");
    expect(res.status).toBe(401);
  });
});

// ─── Admin: stylist approval ────────────────────────────────────────────────────

describe("admin stylist approval", () => {
  it("lists the pending stylist and approves it, writing an audit log", async () => {
    const list = await request(app)
      .get("/api/v1/admin/stylists?status=PENDING_APPROVAL")
      .set(auth(adminToken));
    expect(list.status).toBe(200);
    expect(list.body.data.items.some((s: { id: string }) => s.id === stylistId)).toBe(true);

    const approve = await request(app)
      .patch(`/api/v1/admin/stylists/${stylistId}/status`)
      .set(auth(adminToken))
      .send({ status: "APPROVED" });
    expect(approve.status).toBe(200);
    expect(approve.body.data.status).toBe("APPROVED");

    const row = await prisma.stylist.findUniqueOrThrow({ where: { id: stylistId } });
    expect(row.status).toBe("APPROVED");
    expect(row.approvedAt).not.toBeNull();
    expect(row.approvedById).toBe(adminId);

    const log = await prisma.auditLog.findFirst({
      where: { action: "STYLIST_STATUS_CHANGED", entityId: stylistId },
      orderBy: { createdAt: "desc" },
    });
    expect(log).not.toBeNull();
    expect((log!.metadata as { to: string }).to).toBe("APPROVED");
  });

  it("only APPROVED stylists are visible on the public list", async () => {
    const res = await request(app).get(`/api/v1/stylists/${stylistId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(stylistId);
  });
});

// ─── Stylist self-management ────────────────────────────────────────────────────

describe("stylist self-management", () => {
  it("creates two services with custom prices", async () => {
    const a = await request(app)
      .post("/api/v1/stylists/me/services")
      .set(auth(stylistToken))
      .send({ name: "Feat Service A", category: "Makeup", price: 8000, duration: 30 });
    expect(a.status).toBe(201);
    svcAId = a.body.data.id;

    const b = await request(app)
      .post("/api/v1/stylists/me/services")
      .set(auth(stylistToken))
      .send({ name: "Feat Service B", category: "Eyes", price: 5000, duration: 30 });
    expect(b.status).toBe(201);
    svcBId = b.body.data.id;

    const list = await request(app).get("/api/v1/stylists/me/services").set(auth(stylistToken));
    expect(list.status).toBe(200);
    expect(list.body.data.items.length).toBeGreaterThanOrEqual(2);
  });

  it("rejects a customer creating a service (403)", async () => {
    const res = await request(app)
      .post("/api/v1/stylists/me/services")
      .set(auth(customerToken))
      .send({ name: "x", category: "Hair", price: 1000, duration: 30 });
    expect(res.status).toBe(403);
  });

  it("creates a package bundling both services with flattened services in the response", async () => {
    const res = await request(app)
      .post("/api/v1/stylists/me/packages")
      .set(auth(stylistToken))
      .send({ name: "Feat Combo", price: 11000, duration: 60, serviceIds: [svcAId, svcBId] });
    expect(res.status).toBe(201);
    expect(res.body.data.services).toHaveLength(2);
    // Flattened: each entry is the service itself (has a name), not a join row.
    expect(res.body.data.services[0].name).toBeTruthy();
  });
});

// ─── Multi-service booking ──────────────────────────────────────────────────────

describe("multi-service booking", () => {
  let bookingId = "";

  it("creates a booking with multiple serviceIds and sums the total", async () => {
    const res = await request(app)
      .post("/api/v1/bookings")
      .set(auth(customerToken))
      .send({ stylistId, serviceIds: [svcAId, svcBId], startTime: slot(1, 9) });
    expect(res.status).toBe(201);
    bookingId = res.body.data.id;
    expect(res.body.data.totalAmount).toBe(13000); // 8000 + 5000

    const lines = await prisma.bookingService.findMany({ where: { bookingId } });
    expect(lines).toHaveLength(2);
    const total = lines.reduce((s, l) => s + l.price, 0);
    expect(total).toBe(13000);
  });

  it("exposes customer phone + address to the assigned stylist (provider view)", async () => {
    const res = await request(app).get("/api/v1/bookings/me").set(auth(stylistToken));
    expect(res.status).toBe(200);
    const found = res.body.data.items.find((b: { id: string }) => b.id === bookingId);
    expect(found).toBeTruthy();
    expect(found.user.phone).toBe("+2348099000111");
    expect(found.user.address).toBe("9 Test Close, Lekki");
  });

  it("rejects a different customer fetching that booking (403)", async () => {
    const other = await register("user", { name: "Feat Other" });
    const res = await request(app).get(`/api/v1/bookings/${bookingId}`).set(auth(other.token));
    expect(res.status).toBe(403);
  });

  it("never leaks customer phone/address on the public stylist detail", async () => {
    const res = await request(app).get(`/api/v1/stylists/${stylistId}`);
    expect(res.status).toBe(200);
    const json = JSON.stringify(res.body.data);
    expect(json.includes("9 Test Close")).toBe(false);
    expect(json.includes("+2348099000111")).toBe(false);
  });
});

// ─── Gift voucher lifecycle ─────────────────────────────────────────────────────

describe("gift voucher", () => {
  let code = "";

  it("creates a voucher for multiple services and sums the total", async () => {
    const res = await request(app)
      .post("/api/v1/gift-vouchers")
      .set(auth(customerToken))
      .send({
        serviceIds: [svcAId, svcBId],
        recipientName: "Gift Recipient",
        recipientEmail: `${RUN}_recipient@glamly.test`,
      });
    expect(res.status).toBe(201);
    code = res.body.data.code;
    expect(res.body.data.totalAmount).toBe(13000);
    expect(res.body.data.services).toHaveLength(2);
  });

  it("checks validity via the public code lookup", async () => {
    const res = await request(app).get(`/api/v1/gift-vouchers/${code}`);
    expect(res.status).toBe(200);
    expect(res.body.data.isRedeemed).toBe(false);
  });

  it("redeems the voucher into a new booking and marks it redeemed", async () => {
    const res = await request(app)
      .post(`/api/v1/gift-vouchers/${code}/redeem`)
      .set(auth(customerToken))
      .send({ stylistId, startTime: slot(2, 10) });
    expect(res.status).toBe(201);
    expect(res.body.data.booking).toBeTruthy();
    expect(res.body.data.voucher.isRedeemed).toBe(true);
  });

  it("rejects a second redemption of the same voucher (409)", async () => {
    const res = await request(app)
      .post(`/api/v1/gift-vouchers/${code}/redeem`)
      .set(auth(customerToken))
      .send({ stylistId, startTime: slot(3, 10) });
    expect(res.status).toBe(409);
  });
});
