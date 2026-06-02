# ADR 0001 — Authentication & Session Management

- **Status:** Accepted
- **Date:** 2026-05-30
- **Area:** `apps/api` (auth), `packages/shared` (auth contract)

## Context

Glamly needs first-party authentication for two transacting roles (USER, STYLIST)
plus an out-of-band ADMIN role. The system is security-critical (handles Nigerian
PII under NDPR, §10) and must run on flaky mobile networks. We need a scheme that
is stateless enough to scale horizontally, yet supports **immediate revocation**
(logout, account suspension) and **token-theft detection** — properties pure
stateless JWT cannot offer alone.

## Decision

### Token model — short access JWT + rotating refresh, Redis-backed
- **Access token:** stateless HS256 JWT, **15 min** TTL. Carries `sub` (user id)
  and `role`. Sent by the client in `Authorization: Bearer`. Never stored in a
  cookie or `localStorage` — the SPA holds it in memory.
- **Refresh token:** opaque-to-the-client HS256 JWT, **30 day** TTL, carrying a
  unique `jti`. Delivered **only** as an `httpOnly`, `SameSite=Lax`,
  `Path=/api/v1/auth` cookie (`Secure` in production). JavaScript can never read
  it, so XSS cannot exfiltrate it.
- **Server authority lives in Redis, not Postgres.** A whitelist of live `jti`s
  (`auth:refresh:{jti}` → userId, plus a per-user set) is the source of truth for
  refresh validity. The `RefreshToken` Postgres table is intentionally left
  unused for sessions; Redis gives O(1) revocation with native TTL expiry.

### Rotation + reuse detection
Every `POST /auth/refresh` **rotates**: the presented `jti` is revoked and a new
one minted. If a correctly-signed refresh token arrives whose `jti` is *absent*
from the whitelist, it was already rotated away — i.e. a replay of a stolen or
old token. The response is to **revoke the user's entire token family** and force
re-login (fail-safe), and to write a `REFRESH_TOKEN_REUSE_DETECTED` audit event.

### Enumeration & timing hardening
- Login returns a single `AUTH_INVALID_CREDENTIALS` / "Invalid credentials" for
  *both* unknown-email and wrong-password. A constant **dummy bcrypt compare**
  runs when the email is unknown, so response timing can't reveal which emails
  are registered.
- `/auth/refresh` returns a single `AUTH_SESSION_EXPIRED` for missing / expired /
  rotated / revoked — never distinguishing the cause.
- **Tradeoff (accepted):** `POST /auth/register` *does* reveal that an email is
  taken (`AUTH_EMAIL_TAKEN`), because a usable signup must reject duplicates. A
  fully enumeration-proof signup (always-202 + verification email) is deferred to
  the Resend integration. Documented at the call site in `auth.service.ts`.

### Passwords
bcrypt cost **12** (CLAUDE.md §6). Policy: 8–72 chars (72 = bcrypt's truncation
limit), with upper + lower + digit. Hashes are never logged or returned.

### Layering (CLAUDE.md §3)
`routes → middleware (rate-limit, validate, authenticate) → controller (thin,
cookie I/O) → service (all logic, zero Express) → repository (Prisma) / Redis
store`. The service is framework-free and unit-tested in isolation.

## Consequences

- **Positive:** horizontal scale (access tokens need no shared state); instant
  revocation and theft detection (Redis); XSS can't steal the refresh token;
  enumeration- and timing-hardened; auth responses are `Cache-Control: no-store`
  so no cache layer can replay a token; every security event is audited (§10).
- **Negative / follow-ups:**
  - Cross-origin browser use (web `:3000` → api `:4000`) with a `SameSite=Lax`
    cookie requires the web app to call the API **same-origin via a Next.js
    rewrite/proxy** (recommended) — otherwise the refresh cookie isn't sent on
    cross-site fetches. Documented for the frontend-wiring phase (§18).
  - Redis is now in the auth hot path; a Redis outage blocks refresh (access
    tokens still validate for up to 15 min). `/ready` already gates on Redis.
  - `x-forwarded-for` is recorded for audit without `trust proxy`; it is
    audit-only and never drives an authz decision. Set `trust proxy` + a trusted
    hop when deployed behind a known LB.

## Endpoint reference

| Method | Path                  | Auth            | Body / Input                                   | Success |
|--------|-----------------------|-----------------|------------------------------------------------|---------|
| POST   | `/api/v1/auth/register` | rate-limited  | `{role:"user"\|"stylist", name, email, password[, phone, specialty, location, priceFrom]}` | 201 — `{user, accessToken, expiresIn}` + refresh cookie |
| POST   | `/api/v1/auth/login`    | rate-limited  | `{email, password}`                            | 200 — `{user, accessToken, expiresIn}` + refresh cookie |
| POST   | `/api/v1/auth/refresh`  | refresh cookie| —                                              | 200 — `{user, accessToken, expiresIn}` + rotated cookie |
| POST   | `/api/v1/auth/logout`   | refresh cookie| —                                              | 200 — clears cookie (idempotent) |
| GET    | `/api/v1/auth/me`       | Bearer access | —                                              | 200 — `{user}` |

Error codes: `AUTH_INVALID_CREDENTIALS`, `AUTH_TOKEN_EXPIRED`,
`AUTH_TOKEN_INVALID`, `AUTH_UNAUTHORIZED`, `AUTH_FORBIDDEN`,
`AUTH_SESSION_EXPIRED`, `AUTH_EMAIL_TAKEN`, `VALIDATION_ERROR` (see
`packages/shared/src/constants.ts`).
