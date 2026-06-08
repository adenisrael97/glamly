<div align="center">

# Glamly — Beauty & Booking Marketplace

**A production-grade, full-stack booking platform for the Nigerian beauty industry**

[![CI](https://github.com/adenisrael97/glamly/actions/workflows/ci.yml/badge.svg)](https://github.com/adenisrael97/glamly/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

*Think Booksy or StyleSeat — built from the ground up for the Nigerian market,
installable on any Android or iOS device, and engineered to survive flaky networks.*

</div>

---

## Overview

Glamly is a **two-sided beauty marketplace** connecting customers with vetted stylists. Customers discover, compare, and book appointments with one tap; stylists manage their entire storefront — services, availability, packages, earnings, and portfolio — from a single dashboard.

The platform ships as a **Progressive Web App (PWA)**: it installs to the home screen, works offline, and sends push notifications for booking confirmations and reminders — all without an App Store.

### What makes this project production-ready

| Quality gate | How it is enforced |
|---|---|
| Zero type errors | `tsc --strict` runs on every CI push; `any` is banned |
| No regressions | `pnpm turbo test` — unit + integration suite runs before every merge |
| Security baseline | bcrypt-12, JWT rotation, Helmet, rate limits, Paystack HMAC webhook verification |
| No double-bookings | DB-level `UNIQUE(stylistId, startTime)` inside a `prisma.$transaction` |
| PII never leaks | Structured logs scrub request bodies; audit trail logs IDs, not identities |
| Performance budget | Lighthouse CI gates — LCP < 2.5 s, CLS < 0.1, TBT < 200 ms |
| Dependency isolation | `web` and `api` share only the `@glamly/shared` package and HTTP; no cross-imports |

---

## Live Demo

> Local setup takes under three minutes — see [Getting Started](#getting-started).

---

## Feature Highlights

### Customer experience

- **Stylist discovery** — paginated catalogue with location, specialty, rating, price-from, and real-time availability badge
- **Advanced search & filters** — debounced full-text search, service category chips, rating/price/sort controls
- **Rich stylist profiles** — portfolio gallery, service list with duration and pricing, review feed, live slot picker
- **Multi-step booking wizard** — Service → Stylist → Date & Time → Details → Confirm, with per-step Zod validation
- **Package bookings** — stylists bundle services; customers book a full package in one transaction
- **Gift vouchers** — purchase a service bundle for a recipient; unique code is emailed and redeemed at checkout
- **Real-time slot updates** — Socket.io broadcasts `slot:locked` / `slot:released` so two users never see the same free slot
- **Push notifications** — Web Push (VAPID) delivers booking confirmations and 24 h reminders to any device
- **Offline-capable** — Serwist (Workbox) service worker queues mutations; BackgroundSync replays them on reconnect
- **Forgot / reset password** — SHA-256–hashed, single-use, 1 h expiry tokens delivered via Resend

### Stylist studio

- Full profile management — bio, specialty, location (lat/lng), portfolio image upload (Cloudinary), tags
- Service CRUD — name, category, description, price, duration, cover image
- Package builder — bundle multiple services at a custom price and duration
- Availability calendar — weekly schedule; slots resolve to DB constraints, not client-side state
- Booking management — accept, confirm, complete, or cancel; audit log captures every transition
- Pending approval flow — new stylists enter `PENDING_APPROVAL`; admin moves them to `APPROVED` before they appear publicly

### Admin panel

- Dashboard KPIs — total users, stylists, bookings, revenue
- Stylist moderation — approve, suspend, or reject with reason
- User management — view, search, soft-delete
- Booking oversight — full booking list with status filter
- Service catalogue moderation

---

## Architecture

```
glamly/
├── apps/
│   ├── web/          → Next.js 15 App Router PWA (React 19, Tailwind CSS)
│   └── api/          → Express.js REST API (layered: route → controller → service → repo)
├── packages/
│   ├── shared/       → Zod schemas, TypeScript types, constants (web & api both import this)
│   └── config/       → Shared ESLint + tsconfig presets
└── infrastructure/
    └── docker/       → docker-compose (PostgreSQL 16 + Redis 7)
```

**Strict boundary rule:** `web` and `api` never import each other. The only shared
code is `@glamly/shared` — Zod schemas validate on both sides from the same source
of truth.

### Backend layer contract

```
HTTP request
  → routes/       path + middleware wiring only
  → middleware/   auth guard, role check, Zod validation, rate limit
  → controllers/  parse req → call service → shape response  (thin)
  → services/     ALL business logic  (zero Express imports; fully testable)
  → repositories/ ALL Prisma calls  (the only layer that touches the DB)
  → PostgreSQL 16
```

### Frontend route groups

```
app/
├── (public)/     stylist catalogue, profiles, services, packages — no auth required
├── (auth)/       login, register, stylist-register, forgot-password, reset-password
├── (protected)/  dashboard, booking detail, account settings  — user auth required
├── (stylist)/    studio (services, availability, packages, bookings)  — STYLIST role
└── (admin)/      admin dashboard, users, stylists, bookings  — ADMIN role
```

Middleware enforces role checks at the edge — no auth logic inside page components.

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Language | TypeScript (strict) | No `any`. Shared types between FE and BE. |
| Frontend | Next.js 15 App Router + React 19 | Server Components by default; client boundary at interaction points |
| Styling | Tailwind CSS | Utility-first; zero runtime; custom token system |
| PWA | Serwist (`@serwist/next`) | Workbox-based; auto-revisioned precache; `skipWaiting` + `clientsClaim` |
| Data fetching | SWR | `keepPreviousData` eliminates filter-change flicker |
| Backend | Express.js | Clean 4-layer architecture |
| Database | PostgreSQL 16 | The only persistence store; all indexes declared; no N+1 |
| ORM | Prisma | Migrations committed and reviewed; parameterized queries by construction |
| Cache / sessions | Redis 7 | Refresh tokens, rate-limit counters, push subscriptions |
| Auth | JWT (access + refresh) + bcrypt | Access tokens in memory (~15 min); refresh via HttpOnly cookie; rotated on each use |
| Validation | Zod | Single schema used on both client and server |
| Payments | Paystack | Webhook-confirmed, idempotent; payment state never trusted from client |
| Email | Resend + React Email | Password reset, booking confirmation, gift voucher delivery |
| File storage | Cloudinary | Stylist portfolios and avatars |
| Realtime | Socket.io | Live slot availability and booking status events |
| Logging | Winston | Structured JSON in production; correlation ID on every line |
| Error reporting | Sentry | `@sentry/node` + `@sentry/nextjs`; tagged with correlation ID |
| Testing | Vitest + Testing Library | Unit (services/utils), integration (routes), component tests |
| CI/CD | GitHub Actions | typecheck → lint → test → build gate on every push |
| Monorepo | pnpm workspaces + Turborepo | Remote cache-ready; parallel task graph |

---

## API Reference

All responses use a consistent envelope:

```jsonc
// success
{ "success": true, "data": { ... } }

// failure
{ "success": false, "error": { "message": "Human readable", "code": "AUTH_INVALID_CREDENTIALS" } }
```

Error codes are constants in `@glamly/shared` — clients branch on `code`, never on the message string.

### Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | — | Create customer or stylist account |
| `POST` | `/api/v1/auth/login` | — | Issue access + refresh tokens |
| `POST` | `/api/v1/auth/refresh` | Cookie | Rotate refresh token |
| `POST` | `/api/v1/auth/logout` | Cookie | Revoke refresh token |
| `POST` | `/api/v1/auth/forgot-password` | — | Send reset link via email |
| `POST` | `/api/v1/auth/reset-password` | — | Consume reset token, set new password |
| `GET` | `/api/v1/auth/me` | JWT | Current user profile |
| `PATCH` | `/api/v1/auth/me` | JWT | Update profile (name, phone, address, avatar) |
| `POST` | `/api/v1/auth/change-password` | JWT | Change password (requires current password) |
| `GET` | `/api/v1/stylists` | — | Paginated stylist catalogue (filter, sort) |
| `GET` | `/api/v1/stylists/:id` | — | Public stylist profile |
| `GET` | `/api/v1/stylists/:id/availability` | — | Open slots for a stylist |
| `GET` | `/api/v1/stylists/:id/reviews` | — | Paginated review feed |
| `GET/POST/PATCH/DELETE` | `/api/v1/stylists/me/*` | STYLIST | Storefront management |
| `GET/POST/PATCH/DELETE` | `/api/v1/services` | Mixed | Service catalogue |
| `GET/POST/PATCH/DELETE` | `/api/v1/packages` | Mixed | Package catalogue |
| `POST` | `/api/v1/bookings` | USER | Create booking (inside transaction) |
| `GET` | `/api/v1/bookings` | JWT | List bookings for current user |
| `GET` | `/api/v1/bookings/:id` | JWT | Booking detail |
| `POST` | `/api/v1/bookings/:id/reschedule` | JWT | Reschedule (PENDING/CONFIRMED only) |
| `POST` | `/api/v1/bookings/:id/cancel` | JWT | Cancel with reason |
| `POST` | `/api/v1/bookings/:id/complete` | STYLIST | Mark completed |
| `POST` | `/api/v1/payments/initiate` | USER | Start Paystack checkout |
| `POST` | `/api/v1/payments/webhook` | HMAC | Receive and verify Paystack event |
| `GET` | `/api/v1/payments/:bookingId/status` | JWT | Payment status |
| `POST` | `/api/v1/reviews` | USER | Submit review (post-COMPLETED booking) |
| `POST` | `/api/v1/push/subscribe` | JWT | Register push subscription (VAPID) |
| `DELETE` | `/api/v1/push/unsubscribe` | JWT | Remove subscription |
| `GET/PATCH/POST` | `/api/v1/admin/*` | ADMIN | Admin operations |
| `GET` | `/health` | — | Liveness check |
| `GET` | `/ready` | — | Readiness (DB + Redis reachable) |

---

## Database Schema

```
User ─────┬──── Stylist ────┬──── Service ─── BookingService ──┐
          │                 ├──── Package ─── PackageService    │
          │                 ├──── Booking ────────────────────────┘
          │                 └──── Review
          ├──── Booking ─── Payment
          │              └─ Review
          ├──── RefreshToken
          ├──── PushSubscription
          ├──── AuditLog
          ├──── GiftVoucher ─── GiftVoucherService
          └──── PasswordReset
```

Key design decisions:

- **`UNIQUE(stylistId, startTime)` on Booking** — the database enforces no double-booking; the service layer does not rely on a read-then-write check, which would race under concurrent load.
- **`PasswordReset.tokenHash`** — only the SHA-256 hash is stored; the raw token travels only in the email link and is never persisted.
- **`Booking.idempotencyKey`** — clients may safely retry booking creation without creating a duplicate.
- **`paystackEventId UNIQUE` on Payment** — a webhook firing twice cannot double-confirm.
- **Soft deletes** — `deletedAt` timestamp on `User`, `Stylist`, `Review`; hard deletes only on verified "delete my account" for NDPR right-to-erasure compliance.
- **Audit log** — immutable record of every security-relevant event (login, password change, role change, booking transition) with `who`, `what`, `when`, and IP.

---

## Security

| Control | Implementation |
|---|---|
| Password hashing | bcrypt, cost factor 12 |
| User enumeration prevention | Constant-time comparison against a pre-hashed dummy on unknown emails |
| Token rotation | Refresh token is one-time-use; revoked on every refresh cycle |
| Rate limiting | `express-rate-limit` on `/api/v1/auth/*` |
| HTTP security headers | `helmet` with strict CSP |
| CORS | Explicit origin allowlist; never `*` in production |
| Input validation | Zod at the middleware layer — bad input never reaches services |
| Webhook integrity | Paystack HMAC-SHA512 signature verified before any state mutation |
| SQL injection | Impossible by construction — Prisma parameterizes all queries |
| Secrets | Never in the repo; `config/index.ts` validates env on boot and exits fast if required keys are absent |
| PII in logs | Request bodies are scrubbed; user IDs (not names/emails) appear in log lines |
| NDPR compliance | Minimum data collection; right-to-erasure via hard-delete endpoint; soft deletes otherwise |

---

## PWA & Offline

The service worker is built with **Serwist** (the maintained Workbox fork) and compiled from `apps/web/src/app/sw.ts` into `public/sw.js` at build time. It is **disabled in development** so HMR is never interrupted by stale caches.

**Caching strategy by resource type:**

| Resource | Strategy |
|---|---|
| `/_next/static`, fonts, images | Cache-first (content-hashed; safe to cache forever) |
| Navigation / HTML | Network-first → falls back to `/offline` page |
| Public catalogue APIs (`/stylists`, `/services`, `/packages` — no `Authorization` header) | Stale-while-revalidate |
| All other `/api/v1` GETs (authenticated, PII) | Network-only — never cached |
| Mutations (offline) | `BackgroundSyncPlugin` queues and replays on reconnect |

On deploy: `skipWaiting` + `clientsClaim` activates the new worker immediately. The client reloads once on `controllerchange` (guarded to prevent infinite loops) — users are silently served the new version within seconds.

---

## Background Jobs

Three cron-style jobs run inside the API process on startup:

| Job | Schedule | Purpose |
|---|---|---|
| `expireBookings` | Every minute | Cancels `PENDING` bookings whose payment window has elapsed |
| `sendReminders` | Every hour | Sends Web Push 24 h before each confirmed appointment |
| `cleanTokens` | Daily | Purges expired and revoked refresh tokens + expired password reset rows |

All jobs handle their own errors and log failures without crashing the server.

---

## Getting Started

### Prerequisites

- **Node.js 22+** (LTS)
- **pnpm 10+** — `npm i -g pnpm`
- **PostgreSQL 16** running locally on port 5432
- **Redis 7** running locally on port 6379

Or use Docker for infrastructure:

```bash
cd infrastructure/docker
docker compose up -d
```

### 1 — Install dependencies

```bash
git clone https://github.com/adenisrael97/glamly.git
cd glamly
pnpm install
```

### 2 — Configure environment

Copy the example env files and fill in your values:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

**Required API variables (`apps/api/.env`):**

```env
# Database
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/glamly"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_ACCESS_SECRET="min-32-char-random-secret"
JWT_REFRESH_SECRET="min-32-char-random-secret"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="30d"

# Server
PORT=4100
NODE_ENV=development
CORS_ORIGINS="http://localhost:3100"

# Third-party (optional in dev — relevant services are skipped if absent)
PAYSTACK_SECRET_KEY="sk_test_..."
RESEND_API_KEY="re_..."
CLOUDINARY_URL="cloudinary://..."
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
WEB_APP_URL="http://localhost:3100"
```

**Required web variable (`apps/web/.env.local`):**

```env
NEXT_PUBLIC_API_URL="http://localhost:4100/api/v1"
```

### 3 — Set up the database

```bash
pnpm --filter @glamly/api db:migrate:dev
pnpm --filter @glamly/api db:generate
```

### 4 — Run in development

```bash
pnpm dev
```

| Service | URL |
|---|---|
| Next.js web | http://localhost:3100 |
| Express API | http://localhost:4100 |

### 5 — Run tests

```bash
pnpm test
```

### 6 — Type-check and lint

```bash
pnpm typecheck
pnpm lint
```

### Production build

```bash
pnpm build
```

---

## CI / CD

Every push triggers the GitHub Actions pipeline (`.github/workflows/ci.yml`):

1. **Provision** — Node 22, pnpm 10, PostgreSQL 16, Redis 7 service containers
2. **Generate** — Prisma client from schema
3. **Migrate** — apply all pending migrations to the CI database
4. **Typecheck** — `tsc --noEmit` across all packages
5. **Lint** — ESLint with shared config
6. **Test** — full Vitest suite (unit + integration; real DB + Redis)
7. **Build** — Next.js production build + API TypeScript compile

The build does not merge red. A failed step in any package blocks the entire pipeline via Turborepo's task graph.

---

## Project Structure

```
glamly/
├── apps/
│   ├── api/
│   │   ├── prisma/
│   │   │   ├── schema.prisma          # Single source of truth for DB shape
│   │   │   └── migrations/            # Forward-only, reviewed migrations
│   │   └── src/
│   │       ├── config/                # Env validation (exits fast on missing keys)
│   │       ├── controllers/           # Thin: parse req → call service → shape res
│   │       ├── errors/                # Typed AppError subclasses + error codes
│   │       ├── integrations/          # Cloudinary, Paystack, Resend, Web Push wrappers
│   │       ├── jobs/                  # Background cron jobs (expire, remind, clean)
│   │       ├── lib/                   # JWT, logger, Redis, Prisma, Sentry, cookies
│   │       ├── middleware/            # Auth, role, validation, rate-limit, upload
│   │       ├── realtime/              # Socket.io server (availability + booking events)
│   │       ├── repositories/          # All Prisma calls (only layer touching the DB)
│   │       ├── routes/v1/             # Express routers (path + middleware wiring only)
│   │       └── services/              # All business logic (zero Express imports)
│   └── web/
│       └── src/
│           ├── app/
│           │   ├── (public)/          # Catalogue, profiles — no auth
│           │   ├── (auth)/            # Login, register, password reset
│           │   ├── (protected)/       # Customer dashboard, bookings, settings
│           │   ├── (stylist)/         # Stylist studio
│           │   ├── (admin)/           # Admin panel
│           │   ├── layout.tsx         # Root layout — providers, Navbar, Footer
│           │   ├── manifest.ts        # Web App Manifest (generated)
│           │   └── sw.ts              # Service worker source (compiled → public/sw.js)
│           ├── components/
│           │   ├── features/          # Domain-aware components (bookings, stylists)
│           │   └── ui/                # Pure, reusable primitives (Button, Input, Skeleton)
│           ├── hooks/                 # usePWA, custom SWR hooks
│           ├── lib/api/               # Axios client with JWT refresh interceptor
│           └── middleware.ts          # Edge auth + role enforcement
└── packages/
    ├── shared/
    │   └── src/                       # Zod schemas, TypeScript types, constants
    └── config/                        # Shared ESLint + tsconfig presets
```

---

## Observability

- Every HTTP request is stamped with a **correlation ID** (`x-request-id`); it appears on every log line for that request and is returned in the response header.
- **Winston** structured JSON logs in production — three deliberate levels: `error` (paging-worthy), `warn` (degraded), `info` (lifecycle).
- `/health` (liveness) is distinct from `/ready` (readiness — requires DB + Redis). Load balancers use `/ready`.
- **Sentry** captures unhandled errors tagged with the correlation ID for cross-system traceability.

---

## Development Workflow

AI-assisted development workflows for productivity, debugging, and documentation.

This project is built and maintained by **Adeniran Israel** — a senior full-stack engineer with 20 years of experience. The codebase reflects production engineering standards:

- **Conventional Commits** (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`)
- **Small, focused PRs** — one concern per branch, linked CI status, screenshots for UI changes
- **Architecture Decision Records** in `docs/adr/` — context, decision, and consequences for every significant choice
- **Expand–contract migrations** — new column → backfill → switch → remove old; never drop a column in one step

---

## Author

**Adeniran Israel**
Senior Full-Stack Engineer · 20 years of experience

[GitHub](https://github.com/adenisrael97) · [Email](mailto:adenisrael97@gmail.com)

---

## License

MIT © 2025 Adeniran Israel
