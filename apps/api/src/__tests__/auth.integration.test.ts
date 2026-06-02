import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../server";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { refreshTokenStore } from "../repositories/refreshTokenStore";
import { ERROR_CODES } from "@glamly/shared";

// Full HTTP lifecycle against the REAL Postgres + Redis (no mocks). Hermetic via
// a per-run email namespace; everything created is torn down in afterAll.

const RUN = `inttest_${Date.now()}`;
const userEmail = `${RUN}_user@glamly.test`;
const stylistEmail = `${RUN}_stylist@glamly.test`;
const password = "Sup3rSecret"; // satisfies the policy: upper+lower+digit, ≥8

let app: Express;
const createdUserIds = new Set<string>();

/** All Set-Cookie header values from a response, normalised to an array. */
function setCookies(res: request.Response): string[] {
  const raw = res.headers["set-cookie"];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

/** The "glamly_rt=<value>" pair to send back on a subsequent request. */
function refreshCookie(res: request.Response): string {
  const cookie = setCookies(res).find((c) => c.startsWith("glamly_rt="));
  if (!cookie) throw new Error("expected a refresh cookie but none was set");
  return cookie.split(";")[0]!;
}

beforeAll(() => {
  app = createApp();
});

afterAll(async () => {
  // Revoke any Redis sessions we created, then remove the rows (stylist profile
  // cascades; audit logs null-out their userId).
  for (const id of createdUserIds) {
    await refreshTokenStore.revokeAllForUser(id);
  }
  await prisma.user.deleteMany({ where: { email: { contains: RUN } } });
  await prisma.$disconnect();
  redis.disconnect();
});

describe("Auth API — full lifecycle", () => {
  let accessToken = "";
  let firstRefreshCookie = "";

  it("1. registers a user (201, httpOnly cookie, no password leak)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ role: "user", name: "Ada Lovelace", email: userEmail, password });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(userEmail);
    expect(res.body.data.user.role).toBe("user");
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.expiresIn).toBeGreaterThan(0);

    // Refresh token is delivered ONLY as an httpOnly, path-scoped cookie.
    const cookie = setCookies(res).find((c) => c.startsWith("glamly_rt="))!;
    expect(cookie).toBeDefined();
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Path=/api/v1/auth");

    // Nothing sensitive in the body.
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain("passwordHash");
    expect(serialized).not.toContain(password);

    createdUserIds.add(res.body.data.user.id);
  });

  it("rejects a duplicate registration (409 AUTH_EMAIL_TAKEN)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ role: "user", name: "Ada Again", email: userEmail, password });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(ERROR_CODES.AUTH_EMAIL_TAKEN);
  });

  it("rejects a weak password at the boundary (400 VALIDATION_ERROR)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ role: "user", name: "Weak", email: `${RUN}_weak@glamly.test`, password: "weak" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
  });

  it("2. logs in with correct credentials (200)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: userEmail, password });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.user.email).toBe(userEmail);

    accessToken = res.body.data.accessToken;
    firstRefreshCookie = refreshCookie(res);
  });

  it("rejects a wrong password with the generic error (401)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: userEmail, password: "WrongPass1" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    expect(res.body.message).toBe("Invalid credentials");
  });

  it("does not reveal whether an unknown email exists (same 401)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: `${RUN}_ghost@glamly.test`, password });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
  });

  it("3. accesses a protected route with the access token (200)", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(userEmail);
  });

  it("blocks the protected route without a token (401)", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe(ERROR_CODES.AUTH_UNAUTHORIZED);
  });

  it("blocks the protected route with a malformed token (401)", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer not.a.real.token");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe(ERROR_CODES.AUTH_TOKEN_INVALID);
  });

  let rotatedCookie = "";

  it("4. refreshes the session, rotating the refresh token (200)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", firstRefreshCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toEqual(expect.any(String));

    rotatedCookie = refreshCookie(res);
    // Rotation means the value actually changed.
    expect(rotatedCookie).not.toBe(firstRefreshCookie);

    accessToken = res.body.data.accessToken;
  });

  it("5. accesses the protected route again with the refreshed token (200)", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(userEmail);
  });

  it("detects reuse of the rotated-away token and fails (401)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", firstRefreshCookie); // the old, already-rotated cookie

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe(ERROR_CODES.AUTH_SESSION_EXPIRED);
  });

  it("6 & 7. logs out, after which the (revoked) refresh token fails (200 → 401)", async () => {
    // Reuse detection above already revoked the whole family, so re-establish a
    // clean session to test logout in isolation.
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: userEmail, password });
    const sessionCookie = refreshCookie(login);

    const logout = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", sessionCookie);
    expect(logout.status).toBe(200);
    // Logout clears the cookie on the client too.
    expect(setCookies(logout).some((c) => c.startsWith("glamly_rt=;"))).toBe(true);

    const afterLogout = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", sessionCookie);
    expect(afterLogout.status).toBe(401);
    expect(afterLogout.body.error.code).toBe(ERROR_CODES.AUTH_SESSION_EXPIRED);
  });
});

describe("Auth API — stylist registration", () => {
  it("registers a stylist and creates the storefront profile (201)", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      role: "stylist",
      name: "Zara Stylist",
      email: stylistEmail,
      password,
      phone: "+2348012345678",
      specialty: "Bridal Makeup",
      location: "Lagos",
      priceFrom: 15000,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe("stylist");
    createdUserIds.add(res.body.data.user.id);

    // The Stylist row exists and is linked to the new user.
    const profile = await prisma.stylist.findUnique({
      where: { userId: res.body.data.user.id },
    });
    expect(profile).not.toBeNull();
    expect(profile?.specialty).toBe("Bridal Makeup");
  });
});
