import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../server";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { refreshTokenStore } from "../repositories/refreshTokenStore";

// Full HTTP lifecycle for push notification routes against real Postgres + Redis.
// Push subscription rows are unique per (endpoint, userId) so each run uses a
// unique endpoint URL derived from the run prefix.

const RUN = `pushtest_${Date.now()}`;
const userEmail = `${RUN}@glamly.test`;
const password = "Sup3rSecret";

let app: Express;
let accessToken = "";
const createdUserIds = new Set<string>();

const fakeEndpoint = `https://push.example.com/sub/${RUN}`;
const fakeP256dh = "BNcRdreALRFXTkOOUHK1EtK2wtZ6h0wPGBK8UZmGiJNMNpZxkpHJmJnGK2mBFDqPLz_0vT8eQzpXaBt8HJh9gXA";
const fakeAuth = "tBHItJI5svbpez7KI4CCXg";

beforeAll(() => {
  app = createApp();
});

afterAll(async () => {
  for (const id of createdUserIds) {
    await refreshTokenStore.revokeAllForUser(id);
  }
  // Clean up push subscriptions and user created in this run.
  await prisma.pushSubscription.deleteMany({ where: { endpoint: { contains: RUN } } });
  await prisma.user.deleteMany({ where: { email: { contains: RUN } } });
  await prisma.$disconnect();
  redis.disconnect();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function register(): Promise<void> {
  const res = await request(app)
    .post("/api/v1/auth/register")
    .send({ role: "user", name: "Push Tester", email: userEmail, password });
  expect(res.status).toBe(201);
  accessToken = res.body.data.accessToken;
  createdUserIds.add(res.body.data.user.id);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Push API", () => {
  beforeAll(async () => {
    await register();
  });

  describe("GET /push/vapid-public-key", () => {
    it("returns the VAPID public key for an authenticated user", async () => {
      const res = await request(app)
        .get("/api/v1/push/vapid-public-key")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // The key is a string or null depending on VAPID_PUBLIC_KEY env config.
      expect(res.body.data).toHaveProperty("publicKey");
    });

    it("rejects an unauthenticated request (401)", async () => {
      const res = await request(app).get("/api/v1/push/vapid-public-key");
      expect(res.status).toBe(401);
    });
  });

  describe("POST /push/subscribe", () => {
    it("creates a push subscription and returns subscribed=true (201)", async () => {
      const res = await request(app)
        .post("/api/v1/push/subscribe")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          endpoint: fakeEndpoint,
          keys: { p256dh: fakeP256dh, auth: fakeAuth },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.subscribed).toBe(true);
    });

    it("is idempotent — re-subscribing the same endpoint returns 201", async () => {
      const res = await request(app)
        .post("/api/v1/push/subscribe")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          endpoint: fakeEndpoint,
          keys: { p256dh: fakeP256dh, auth: fakeAuth },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.subscribed).toBe(true);
    });

    it("rejects missing keys with 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post("/api/v1/push/subscribe")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ endpoint: fakeEndpoint }); // no keys

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects a non-URL endpoint with 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post("/api/v1/push/subscribe")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ endpoint: "not-a-url", keys: { p256dh: fakeP256dh, auth: fakeAuth } });

      expect(res.status).toBe(400);
    });

    it("rejects an unauthenticated request (401)", async () => {
      const res = await request(app)
        .post("/api/v1/push/subscribe")
        .send({ endpoint: fakeEndpoint, keys: { p256dh: fakeP256dh, auth: fakeAuth } });
      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /push/subscribe", () => {
    it("removes the subscription and returns unsubscribed=true (200)", async () => {
      const res = await request(app)
        .delete("/api/v1/push/subscribe")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ endpoint: fakeEndpoint });

      expect(res.status).toBe(200);
      expect(res.body.data.unsubscribed).toBe(true);
    });

    it("is idempotent — unsubscribing a non-existent endpoint is still 200", async () => {
      const res = await request(app)
        .delete("/api/v1/push/subscribe")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ endpoint: fakeEndpoint });

      expect(res.status).toBe(200);
    });

    it("rejects a non-URL endpoint body with 400", async () => {
      const res = await request(app)
        .delete("/api/v1/push/subscribe")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ endpoint: "bad" });

      expect(res.status).toBe(400);
    });

    it("rejects an unauthenticated request (401)", async () => {
      const res = await request(app)
        .delete("/api/v1/push/subscribe")
        .send({ endpoint: fakeEndpoint });
      expect(res.status).toBe(401);
    });
  });
});
