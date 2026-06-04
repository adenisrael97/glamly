import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../server";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { refreshTokenStore } from "../repositories/refreshTokenStore";

// HTTP tests for the public services catalogue against the REAL Postgres + Redis.
// Hermetic via a per-run email namespace and a unique category, so assertions
// don't depend on seed data. All created rows are torn down in afterAll.

const RUN = `svctest_${Date.now()}`;
const password = "Sup3rSecret";
// A category unique to this run so category filters/counts are deterministic
// regardless of what else lives in the DB.
const CATEGORY = `Cat_${RUN}`;

let app: Express;
const createdUserIds = new Set<string>();
let stylistId = "";
let stylistToken = "";
let activeServiceId = "";
let inactiveServiceId = "";

async function registerStylist(): Promise<{ token: string; id: string }> {
  const res = await request(app)
    .post("/api/v1/auth/register")
    .send({
      role: "stylist",
      name: "Service Test Stylist",
      email: `${RUN}_stylist_${Math.random().toString(36).slice(2, 8)}@glamly.test`,
      password,
      phone: "+2348012345678",
      specialty: "Makeup",
      location: "Lekki",
      priceFrom: 9000,
    });
  expect(res.status).toBe(201);
  createdUserIds.add(res.body.data.user.id);
  return { token: res.body.data.accessToken, id: res.body.data.user.id };
}

beforeAll(async () => {
  app = createApp();

  const s = await registerStylist();
  stylistToken = s.token;
  const profile = await prisma.stylist.findUniqueOrThrow({ where: { userId: s.id } });
  stylistId = profile.id;

  const active = await prisma.service.create({
    data: {
      stylistId,
      name: "Glam Makeup",
      category: CATEGORY,
      description: "Full glam",
      price: 12000,
      duration: 60,
    },
  });
  activeServiceId = active.id;

  // An inactive service must never surface in the public catalogue.
  const inactive = await prisma.service.create({
    data: {
      stylistId,
      name: "Retired Service",
      category: CATEGORY,
      price: 5000,
      duration: 30,
      isActive: false,
    },
  });
  inactiveServiceId = inactive.id;
});

afterAll(async () => {
  for (const id of createdUserIds) await refreshTokenStore.revokeAllForUser(id);
  await prisma.service.deleteMany({ where: { stylistId } });
  await prisma.user.deleteMany({ where: { email: { contains: RUN } } });
  await prisma.$disconnect();
  redis.disconnect();
});

describe("Stylist profile API (GET /stylists/me/profile)", () => {
  it("returns the authenticated stylist's own storefront profile", async () => {
    const res = await request(app)
      .get("/api/v1/stylists/me/profile")
      .set("Authorization", `Bearer ${stylistToken}`);
    expect(res.status).toBe(200);
    // Seeded from registration (specialty/location); the rest are storefront
    // defaults the studio edit form must be able to read back.
    expect(res.body.data).toMatchObject({
      specialty: "Makeup",
      location: "Lekki",
      isAvailable: true,
      tags: [],
      portfolioUrls: [],
      avatarUrl: null,
      experience: null,
    });
  });

  it("requires authentication (401 without a token)", async () => {
    const res = await request(app).get("/api/v1/stylists/me/profile");
    expect(res.status).toBe(401);
  });
});

describe("Services API", () => {
  it("lists services with pagination metadata", async () => {
    const res = await request(app).get("/api/v1/services?limit=5");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items.length).toBeLessThanOrEqual(5);
    expect(res.body.data.meta).toMatchObject({ page: 1, limit: 5 });
  });

  it("filters by stylistId (only that stylist's active services)", async () => {
    const res = await request(app).get(`/api/v1/services?stylistId=${stylistId}&limit=50`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(1); // the inactive one is excluded
    expect(res.body.data.items[0].id).toBe(activeServiceId);
    for (const svc of res.body.data.items) expect(svc.stylistId).toBe(stylistId);
  });

  it("filters by category", async () => {
    const res = await request(app).get(`/api/v1/services?category=${CATEGORY}&limit=50`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].category).toBe(CATEGORY);
    expect(res.body.data.meta.total).toBe(1);
  });

  it("excludes inactive services from the catalogue", async () => {
    const res = await request(app).get(`/api/v1/services?stylistId=${stylistId}&limit=50`);
    const ids = res.body.data.items.map((s: { id: string }) => s.id);
    expect(ids).not.toContain(inactiveServiceId);
  });

  it("includes the new category in the categories list", async () => {
    const res = await request(app).get("/api/v1/services/categories");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toContain(CATEGORY);
  });

  it("returns a single active service with its stylist", async () => {
    const res = await request(app).get(`/api/v1/services/${activeServiceId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(activeServiceId);
    expect(res.body.data.stylist).toMatchObject({ id: stylistId });
  });

  it("404s an inactive service by id", async () => {
    const res = await request(app).get(`/api/v1/services/${inactiveServiceId}`);
    expect(res.status).toBe(404);
  });

  it("404s an unknown service id", async () => {
    const res = await request(app).get("/api/v1/services/ckunknownunknownunknown00");
    expect(res.status).toBe(404);
  });

  it("rejects a non-cuid stylistId with a validation error (400)", async () => {
    const res = await request(app).get("/api/v1/services?stylistId=not-a-cuid");
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects a page size over the hard cap (400)", async () => {
    const res = await request(app).get("/api/v1/services?limit=999");
    expect(res.status).toBe(400);
  });
});
