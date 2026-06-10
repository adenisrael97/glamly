<div align="center">

<img src="apps/web/public/icons/icon-192.png" alt="Glamly" width="96" height="96" />

# Glamly

### Nigeria's Beauty & Booking Marketplace

**Discover, book, and pay for top-rated beauty professionals — all in a fast, installable Progressive Web App built for the Nigerian market.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169e1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2d3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Redis](https://img.shields.io/badge/Redis-7-dc382d?logo=redis&logoColor=white)](https://redis.io/)
[![Paystack](https://img.shields.io/badge/Payments-Paystack-00c3f7)](https://paystack.com/)
[![CI](https://img.shields.io/badge/CI-GitHub%20Actions-2088ff?logo=githubactions&logoColor=white)](https://github.com/adeniran-israel/glamly/actions)
[![PWA](https://img.shields.io/badge/PWA-Ready-5a0fc8)](https://web.dev/progressive-web-apps/)

</div>

---

## Overview

**Glamly** is a production-grade beauty booking marketplace designed specifically for the Nigerian market — think Booksy or StyleSeat, built from the ground up for West African consumers and internet conditions.

The platform connects two primary roles: **customers** who discover and book beauty services, and **stylists** who manage their storefront, availability, and earnings. Every transaction — booking, payment, confirmation, cancellation, and review — flows through a clean full-stack system built to handle real-world concurrency and network conditions.

Key business differentiators:

- **Installable PWA** — works offline, installs to the home screen, and runs on low-end Android devices with flaky connections
- **Paystack-native payments** — the only payment provider with strong Nigerian market coverage and local card support
- **Multi-channel notifications** — email, Web Push, and real-time Socket.io events keep both parties informed at every booking state change
- **Admin approval pipeline** — all stylist profiles go through an approval workflow before becoming publicly visible, maintaining platform quality

---

## Live Architecture

```
glamly/
├── apps/
│   ├── web/      → Next.js 15 (App Router) PWA — installable client
│   └── api/      → Express.js REST API — the application server
├── packages/
│   ├── shared/   → Zod schemas, TypeScript types, constants (shared FE + BE)
│   └── config/   → shared ESLint + TypeScript presets
└── infrastructure/ → Docker Compose, nginx, database init
```

**Monorepo managed with pnpm workspaces + Turborepo.** The only contract between `web` and `api` is the `shared` package and HTTP — the frontend never imports backend code.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Language | TypeScript 5.8 (strict) | No `any`. Zero type errors in CI. |
| Frontend | Next.js 15 App Router + React 19 | Server Components by default |
| Styling | Tailwind CSS v4 | No inline styles |
| Animations | Framer Motion | Page transitions, micro-interactions |
| PWA | Serwist / Workbox + Web Manifest | Offline, install, push |
| Data Fetching | SWR | `keepPreviousData` to avoid flicker |
| HTTP Client | Axios | Interceptor-based token refresh |
| Backend | Express.js | Layered: route → controller → service → repo |
| Database | PostgreSQL 16 | The only persistence store |
| ORM | Prisma 6 | Migrations are committed and reviewed |
| Cache / Sessions | Redis 7 | Refresh tokens, rate limits, push subs |
| Auth | JWT (access + refresh) + bcrypt | Access token in memory, refresh in httpOnly cookie |
| Validation | Zod | One schema, shared frontend + backend |
| Payments | Paystack | HMAC webhook-only confirmation |
| Email | Resend + React Email | Transactional templates |
| Real-time | Socket.io | Live availability + booking state |
| File Storage | Cloudinary | Avatar and portfolio images |
| Logging | Winston | Structured JSON, correlation IDs |
| Error Reporting | Sentry | Both API (`@sentry/node`) and web (`@sentry/nextjs`) |
| Testing | Vitest + Testing Library + Playwright | Unit, integration, E2E |
| CI/CD | GitHub Actions | typecheck · lint · test · build gate |
| Package Manager | pnpm 10 + Turborepo 2 | Caching, parallel pipelines |

---

## Features

### Customer Features

- **Stylist discovery** — browse approved stylists with location, specialty, rating, pricing, and portfolio
- **Search & filter** — find stylists by name, specialty, and location with debounced search
- **Stylist profiles** — full public profiles with bio, portfolio gallery, services list, and verified reviews
- **Appointment booking** — book individual services or pre-built packages, choose a time slot, add notes
- **Multi-service bookings** — select multiple services in one booking; prices and durations are summed automatically
- **Package bookings** — book stylist-curated service bundles at a package price
- **Payment with Paystack** — hosted Paystack checkout with per-booking callback URL; booking confirmed only via signed webhook
- **Booking management** — view all bookings, cancel with a reason, reschedule to a new slot
- **Reviews** — leave a star rating and comment after a completed appointment
- **Gift vouchers** — purchase a gift voucher for a recipient tied to specific services; recipient redeems it to create a real booking
- **Customer dashboard** — unified view of upcoming, confirmed, and past appointments
- **Account settings** — update name, phone, address, upload avatar, change password
- **Password reset** — forgot-password email flow with secure, time-limited token (SHA-256 stored, raw token email-only)
- **PWA install** — custom install prompt, home screen shortcut, offline fallback page
- **Web Push notifications** — booking confirmations, 24-hour appointment reminders
- **Favorites** — local favorites for quick-access to saved stylists

### Stylist Features

- **Studio dashboard** — overview of upcoming bookings, total earnings, quick actions
- **Service management** — create, edit, deactivate services (name, category, price, duration, image)
- **Package management** — bundle services into named packages with a fixed price and duration
- **Portfolio management** — upload/remove portfolio images via Cloudinary; multiple images supported
- **Avatar upload** — update profile photo (Cloudinary, JPEG/PNG/WebP, ≤ 5 MB)
- **Profile management** — update bio, specialty, location, tags, experience, and availability toggle
- **Booking management** — view all bookings on their storefront; mark bookings as completed
- **Pending approval banner** — newly registered stylists see their status and cannot accept bookings until approved
- **Real-time slot updates** — slots lock/release live via Socket.io as customers book

### Admin Features

- **Analytics dashboard** — total users, total stylists, pending approvals, total revenue, total bookings, revenue bar chart (last 6 months), top 5 stylists by revenue, recent bookings feed
- **Stylist approval pipeline** — list all stylists filtered by status (PENDING\_APPROVAL / APPROVED / SUSPENDED / REJECTED); approve, reject, or suspend with an optional reason; real-time Socket.io status notification to the stylist
- **Stylist detail view** — full profile with services, portfolio, and booking history
- **User management** — list all users with search and role filter; view individual profiles; change user role; soft-delete users
- **Booking oversight** — paginated booking list with filters for status, stylist, user, and date range; booking detail view
- **Service moderation** — list all platform services; deactivate any service
- **Platform settings** — admin settings panel

---

## Platform Architecture

### Backend Layering

Every request flows through strictly separated layers:

```
HTTP Request
  → routes/         path + middleware wiring only
  → middleware/      auth, role, validation, rate limit
  → controllers/     parse req, call service, shape response (THIN)
  → services/        ALL business logic (zero Express imports)
  → repositories/    ALL database access (only place Prisma is called)
  → PostgreSQL
```

Third-party APIs (Paystack, Resend, Cloudinary, web-push) are wrapped in `integrations/` so they can be swapped or mocked without touching business logic.

### Frontend Route Groups

```
(public)/       → Home, stylist listing, profiles, services, packages, search, gift service, offline
(auth)/         → Login, register, stylist registration, forgot/reset password
(protected)/    → Book appointment, booking detail, customer dashboard, account settings
(stylist)/      → Studio overview, services, packages, availability, bookings, pending, profile
(admin)/        → Admin dashboard, stylists, users, bookings, services, settings
```

Next.js `middleware.ts` enforces role-based routing using a non-httpOnly hint cookie; real enforcement lives in the API where every protected endpoint validates the JWT.

---

## Database Design

**14 models, 1 database (PostgreSQL 16), managed by Prisma with forward-only reviewed migrations.**

| Model | Purpose |
|---|---|
| `User` | All platform users (role: USER / STYLIST / ADMIN). Soft-deleted on removal. |
| `Stylist` | One-to-one stylist profile (status: PENDING\_APPROVAL / APPROVED / SUSPENDED / REJECTED) |
| `Service` | Services offered by a stylist — price, duration, category, image |
| `Package` | Stylist-defined service bundles at a fixed price |
| `PackageService` | Many-to-many join between Package and Service |
| `Booking` | Core booking record; supports single service, multi-service, and package bookings |
| `BookingService` | Price-snapshotted join for multi-service bookings (future price changes don't affect historical records) |
| `Payment` | One-to-one with Booking; tracks Paystack reference and event ID for idempotency |
| `Review` | One-to-one with Booking; requires a completed booking |
| `RefreshToken` | Stored as SHA-256 hash; rotated on every use, revocable |
| `PasswordReset` | Single-use, 1-hour TTL, stored as SHA-256 hash |
| `PushSubscription` | VAPID Web Push endpoint per user device |
| `AuditLog` | Immutable log of security-relevant events (login, booking state transitions, payment events, role changes) |
| `GiftVoucher` | Gift vouchers tied to specific services, 90-day expiry, atomic single-redemption |

**Concurrency guarantees:**

- Double-booking is prevented by a DB-level unique constraint on `(stylistId, startTime)`, enforced inside a transaction
- Gift voucher redemption uses a guarded claim pattern — two concurrent redemptions cannot both succeed
- Payment webhook confirmation is idempotent via unique `paystackEventId`; replayed deliveries are silently no-op'd
- Abandoned bookings are expired by a background job using a race-safe repository method

---

## Authentication & Authorization

| Feature | Implementation |
|---|---|
| Registration | bcrypt (cost 12+) password hash; welcome email; role assigned at registration |
| Login | Returns short-lived JWT access token (15m) in response body; long-lived refresh token (30d) in httpOnly cookie |
| Token Refresh | `POST /auth/refresh` reads httpOnly cookie; issues new access + refresh pair (token rotation) |
| Logout | Revokes refresh token in DB; clears cookie |
| Role guard | `requireRole()` middleware; roles: `USER`, `STYLIST`, `ADMIN` |
| Frontend routing | Next.js middleware reads `glamly_role` hint cookie for optimistic route protection |
| Password reset | `POST /auth/forgot-password` → signed email link → `POST /auth/reset-password`; SHA-256 stored, replay-safe |
| Password change | Authenticated; requires current password verification |
| Avatar upload | Authenticated multipart endpoint → Cloudinary |
| Rate limiting | Auth endpoints rate-limited; global limiter on all routes |
| Cache prevention | Auth routes set `Cache-Control: no-store` to prevent browser/proxy caching of tokens and PII |

---

## Payment System

Glamly uses **Paystack** as its exclusive payment provider.

**Flow:**

1. Customer creates a booking (status: `PENDING`)
2. `POST /payments/initiate` creates a Paystack transaction and returns a hosted checkout URL
3. Customer completes payment on Paystack's hosted page
4. Paystack calls `POST /payments/webhook` with a signed event
5. API verifies HMAC-SHA512 signature over the raw request body — rejects if absent or wrong
6. On `charge.success`: booking moves to `CONFIRMED`, both parties notified via email + push + Socket.io
7. On `charge.failed` / `charge.abandoned`: payment row marked FAILED

**Idempotency:** every webhook event carries a unique `id` stored as `paystackEventId`. A replayed delivery finds the row already confirmed and silently no-ops. An `amount_mismatch` never confirms the booking — it is logged loudly for manual review.

**Retry safety:** each call to `/payments/initiate` generates a fresh Paystack reference so retries always produce a valid, fresh checkout URL.

**Slot expiry:** a background job runs every 60 seconds and cancels bookings that have been `PENDING` (unpaid) longer than the configured payment window, freeing the slot for other customers.

---

## Notification System

Glamly delivers notifications across **three channels** simultaneously, orchestrated by a single `notificationsService`:

| Event | Email (Resend) | Web Push (VAPID) | Real-time (Socket.io) |
|---|---|---|---|
| Registration | Welcome email | — | — |
| Booking confirmed | Customer confirmation | Customer + Stylist | Both private rooms |
| Booking cancelled | Customer + Stylist | Customer + Stylist | Both rooms + slot released |
| Booking reminder (24 h) | Customer | Customer | — |
| Slot locked (pending) | — | — | Availability room |
| Stylist status changed | Stylist | — | Stylist room |
| Password reset | Reset link email | — | — |

All notifications are **fire-and-forget** — a delivery failure is logged but never propagates to break the booking or auth flow. Email templates are React components rendered server-side with `@react-email/render`.

### Real-time Architecture (Socket.io)

```
user:<userId>              — private room; booking events land here
availability:<stylistId>   — public room; slot lock/release events
```

The Socket.io handshake validates the same JWT access token as the REST API. Unauthenticated sockets are rejected before joining any room. Customers subscribe to a stylist's availability room while viewing the calendar; slots grey out in real time as others book.

---

## Progressive Web App

Glamly is a fully installable PWA that passes the Lighthouse PWA audit.

| Feature | Implementation |
|---|---|
| Web Manifest | `manifest.ts` — maskable 192/512 icons, standalone display, theme `#e11d48`, 2 shortcuts |
| Service Worker | `sw.ts` built with Serwist (Workbox); generated into `public/sw.js` at build |
| Precaching | `self.__SW_MANIFEST` — content-hashed per-file revision manifest; `cleanupOutdatedCaches` on activate |
| Skip Waiting | `skipWaiting + clientsClaim` — new worker activates immediately; client auto-reloads once |
| Offline Fallback | `/offline` page precached; navigation fallback when network is unavailable |
| Caching Strategy | Public catalogue GETs → stale-while-revalidate; Authenticated/PII routes → network-only (never cached); Static assets → cache-first |
| Background Sync | Non-auth mutations queued with `BackgroundSyncPlugin` when offline; replayed on reconnect |
| Web Push | VAPID push via `web-push`; `push` + `notificationclick` handlers in service worker |
| Install Prompt | Custom `InstallPrompt` component captures `beforeinstallprompt` |
| Offline Banner | `OfflineBanner` monitors `online/offline` events |
| Dev Safety | SW disabled in development (`SWDevCleanup` removes stale workers); HMR is the source of truth |

---

## Background Jobs

Three scheduled jobs run in-process with the API server:

| Job | Schedule | Purpose |
|---|---|---|
| `expireBookings` | Every 60 seconds | Cancel unpaid PENDING bookings past the payment window; release their slots |
| `sendReminders` | Top of every hour | Send 24 h email + push reminders for upcoming CONFIRMED bookings (claim-before-send prevents duplicates) |
| `cleanTokens` | Daily | Purge expired and revoked refresh tokens from the database (NDPR data retention) |

All jobs export a plain function for unit testing without a scheduler, and return a stop function used during graceful shutdown.

---

## Observability & Reliability

| Feature | Implementation |
|---|---|
| Correlation IDs | `x-request-id` attached to every request; echoed in response; threads through all log lines via `AsyncLocalStorage` |
| Structured Logging | Winston JSON logs in production; `error` (paging), `warn` (degraded), `info` (lifecycle) |
| Error Reporting | Sentry on both API and Next.js frontend; correlation ID attached for traceability |
| Liveness | `GET /health` — process alive check; never rate-limited |
| Readiness | `GET /ready` — DB + Redis reachable; used by load balancers |
| Audit Log | Immutable `AuditLog` table records: login, password change, role change, booking state transitions, payment events, stylist approvals |
| Error Taxonomy | Typed `ERROR_CODES` in `shared`; clients branch on `code`, never on human message; no stack traces or SQL in responses |
| PII Protection | No email, phone, name, or location written to logs; only user IDs; request bodies scrubbed by logger |

---

## Security Baseline

- Passwords hashed with **bcrypt (cost ≥ 12)**; never logged, never returned in any response
- **JWT access tokens** short-lived (15 m); **refresh tokens** rotated on every use and revocable
- **helmet** for HTTP security headers; **strict CORS allowlist** (never `*` in production); `express-rate-limit` on all auth endpoints and globally
- All input validated with **Zod** at the boundary before reaching any service
- Paystack webhooks verified by **HMAC-SHA512 signature over raw request body**
- Payment state is **idempotent** — a webhook firing twice cannot double-confirm
- **Soft deletes** (`deletedAt`) for users and stylists; hard delete only on verified right-to-erasure request (NDPR)
- SQL injection impossible by construction — Prisma parameterizes all queries
- No secrets in the repository; `config/index.ts` validates all env vars on boot and **fails fast**
- Auth responses carry `Cache-Control: no-store` to prevent browser and proxy caching of tokens and PII

---

## CI / CD Pipeline

GitHub Actions runs on every push to every branch and every PR targeting `main`.

```
Jobs: typecheck · lint · test · build

Services spun up in CI:
  postgres:16-alpine   (real database; migrations applied)
  redis:7-alpine       (real Redis instance)

Steps:
  1. Install dependencies (pnpm frozen lockfile)
  2. Generate Prisma client
  3. Run database migrations (prisma migrate deploy)
  4. TypeScript typecheck (tsc --noEmit)
  5. ESLint lint
  6. Vitest test suite (unit + integration against real DB + Redis)
  7. Build verification (Next.js + API TypeScript compile)
```

Integration tests run against a real PostgreSQL 16 and Redis 7 instance — no mocks. **No PR merges red.**

---

## Performance Optimizations

- **Turborepo** caches build, lint, typecheck, and test tasks; only changed packages are rebuilt
- **Next.js dynamic imports** on all below-the-fold landing page sections with skeleton placeholders
- **SWR** for all client-side data fetching with `keepPreviousData` to prevent loading flickers
- **Paginated API responses** on every list endpoint; default page size 20, hard cap 50
- **Database indexes** on every column used in `WHERE` / `ORDER BY` / join; composite indexes for common query patterns
- **Zero N+1 queries** — Prisma `include`/`select` used deliberately; multi-record lookups use `findMany` with `in`
- **Service worker caching** — public catalogue APIs served from stale-while-revalidate cache for instant repeat loads
- **Redis-backed rate limiting** — rate limit state shared across API instances via `rate-limit-redis`
- **Cloudinary CDN** — all user-uploaded media served from Cloudinary's edge; no binary storage in the database

---

## Project Structure

```
glamly/
├── .github/
│   └── workflows/ci.yml               # Typecheck · lint · test · build
├── apps/
│   ├── api/                            # Express.js REST API
│   │   ├── prisma/
│   │   │   ├── schema.prisma           # 14 models, enums, indexes
│   │   │   └── migrations/             # Forward-only reviewed migrations
│   │   └── src/
│   │       ├── config/                 # Env validation (fails fast on boot)
│   │       ├── controllers/            # Auth, bookings, payments, admin, stylists, reviews, push, services
│   │       ├── emails/                 # React Email templates (welcome, confirmation, reminder, reset, cancelled)
│   │       ├── errors/                 # Typed AppError hierarchy
│   │       ├── integrations/           # Cloudinary, Paystack, Resend, web-push wrappers
│   │       ├── jobs/                   # expireBookings, sendReminders, cleanTokens
│   │       ├── lib/                    # JWT, Redis, Prisma, Winston, Sentry, correlation ID
│   │       ├── middleware/             # Auth, role, validate, rate limit, upload, errorHandler
│   │       ├── realtime/               # Socket.io server + typed emit helpers
│   │       ├── repositories/           # DB access layer (only place Prisma is called)
│   │       ├── routes/v1/              # auth, bookings, payments, stylists, admin, push, reviews, packages, gift-vouchers
│   │       ├── services/               # Business logic: auth, bookings, payments, admin, notifications, push, reviews, stylist-me, gift-vouchers
│   │       └── __tests__/              # Integration tests: auth, booking, payment, push, services, admin
│   └── web/                            # Next.js 15 PWA
│       ├── public/
│       │   └── icons/                  # PWA icons (72 → 512 px, maskable)
│       └── src/
│           ├── app/
│           │   ├── (public)/           # Home, stylists, services, packages, search, gift-service, offline
│           │   ├── (auth)/             # Login, register, stylist-register, forgot/reset password
│           │   ├── (protected)/        # Book appointment, booking detail, customer dashboard, settings
│           │   ├── (stylist)/          # Studio: overview, services, packages, availability, bookings, profile
│           │   ├── (admin)/            # Dashboard, stylists, users, bookings, services, settings
│           │   ├── manifest.ts         # PWA manifest
│           │   └── sw.ts               # Serwist service worker source
│           ├── components/
│           │   ├── ui/                 # Button, Card, Input, Skeleton, InstallPrompt, OfflineBanner, AvatarUpload, PushPermissionButton, SWDevCleanup
│           │   ├── features/           # BookingCard, AccountSettings, ServiceSelector
│           │   ├── Landing/            # Hero, Service, ServicesCard, Collection, Packages, Hairstylists, Testimonial, OurStory, Address, Whatsapp
│           │   ├── Search/             # Searchpage, SearchFilters, StylistCard
│           │   └── Layout/             # Navbar, Footer, HideOnDashboard, NewsletterForm
│           ├── context/AuthContext.tsx # Auth state, access token in memory, refresh interceptor
│           ├── hooks/                  # useBookings, useStylists, useServices, usePWA, useRealtime, useFavorites, useDebounce
│           ├── lib/api/                # Axios client + API modules: auth, bookings, stylists, services, payments, admin, reviews, push, packages, gift-vouchers, stylist-me
│           └── middleware.ts           # Role-based route protection
├── packages/
│   ├── shared/src/                     # Zod schemas, TypeScript types, error codes, socket events, constants
│   └── config/                         # Shared ESLint + tsconfig presets
├── infrastructure/                     # Docker Compose, nginx
├── docs/adr/                           # Architecture Decision Records
└── .env.example
```

---

## Local Setup

### Prerequisites

- **Node.js 22** (LTS)
- **pnpm 10** — `corepack enable && corepack prepare pnpm@10.11.0 --activate`
- **PostgreSQL 16** running locally or via Docker
- **Redis 7** running locally or via Docker

### 1. Clone & Install

```bash
git clone https://github.com/adeniran-israel/glamly.git
cd glamly
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your local values — see Environment Variables below
```

### 3. Database Setup

```bash
# Generate the Prisma client
pnpm --filter @glamly/api db:generate

# Run all migrations
pnpm --filter @glamly/api db:migrate

# (Optional) Seed with sample data
pnpm --filter @glamly/api db:seed
```

### 4. Start Development Servers

```bash
pnpm dev
# API  →  http://localhost:4100
# Web  →  http://localhost:3100
```

### 5. Run the CI Pipeline Locally

```bash
pnpm typecheck   # TypeScript check across all packages
pnpm lint        # ESLint
pnpm test        # Vitest (unit + integration)
pnpm build       # Build all packages
```

---

## Environment Variables

### API (`apps/api/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `PORT` | API port (default `4000`) |
| `NODE_ENV` | `development` / `production` / `test` |
| `JWT_ACCESS_SECRET` | Access token signing secret (≥ 32 chars) |
| `JWT_REFRESH_SECRET` | Refresh token signing secret (≥ 32 chars) |
| `JWT_ACCESS_EXPIRES_IN` | Access token TTL (e.g. `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL (e.g. `30d`) |
| `PAYSTACK_SECRET_KEY` | Paystack secret key (`sk_live_...` / `sk_test_...`) |
| `PAYSTACK_PUBLIC_KEY` | Paystack public key |
| `PAYSTACK_WEBHOOK_SECRET` | Paystack webhook signing secret |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `RESEND_API_KEY` | Resend API key (`re_...`) |
| `EMAIL_FROM` | Sender address (e.g. `Glamly <noreply@glamly.ng>`) |
| `WEB_APP_URL` | Public frontend URL (used in email links) |
| `VAPID_PUBLIC_KEY` | VAPID public key for Web Push |
| `VAPID_PRIVATE_KEY` | VAPID private key for Web Push |
| `VAPID_SUBJECT` | VAPID contact (`mailto:noreply@glamly.ng`) |
| `SENTRY_DSN` | Sentry DSN (optional; no-op if absent) |
| `CORS_ORIGINS` | Comma-separated allowed origins |

### Web (`apps/web/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | API base URL including version prefix (`/api/v1`) |
| `SENTRY_DSN` | Sentry DSN for the frontend |

---

## API Overview

All API responses follow the envelope pattern:

```json
// Success
{ "success": true, "message": "...", "data": { ... } }

// Error
{ "success": false, "message": "...", "error": { "code": "BOOKING_SLOT_TAKEN", "message": "..." } }
```

### Key Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | — | Register a new user or stylist |
| POST | `/api/v1/auth/login` | — | Log in; returns access token + sets refresh cookie |
| POST | `/api/v1/auth/refresh` | — | Rotate refresh token |
| GET | `/api/v1/auth/me` | JWT | Get current user profile |
| POST | `/api/v1/auth/forgot-password` | — | Request password reset email |
| POST | `/api/v1/auth/reset-password` | — | Consume reset token and set new password |
| GET | `/api/v1/stylists` | — | List approved stylists (paginated, filterable) |
| GET | `/api/v1/stylists/:id` | — | Get stylist public profile |
| GET | `/api/v1/stylists/:id/availability` | — | Get available time slots for a date |
| GET | `/api/v1/stylists/:id/reviews` | — | Get paginated reviews for a stylist |
| GET | `/api/v1/stylists/me/services` | STYLIST | List own services |
| POST | `/api/v1/stylists/me/services` | STYLIST | Create a service |
| POST | `/api/v1/stylists/me/packages` | STYLIST | Create a package |
| POST | `/api/v1/stylists/me/avatar` | STYLIST | Upload avatar image |
| POST | `/api/v1/stylists/me/portfolio` | STYLIST | Add portfolio image |
| POST | `/api/v1/bookings` | USER | Create a booking |
| GET | `/api/v1/bookings/me` | JWT | List own bookings (role-aware) |
| PATCH | `/api/v1/bookings/:id/cancel` | USER | Cancel a booking |
| PATCH | `/api/v1/bookings/:id/reschedule` | USER | Reschedule a booking |
| PATCH | `/api/v1/bookings/:id/complete` | STYLIST | Mark booking completed |
| POST | `/api/v1/payments/initiate` | USER | Start Paystack checkout |
| POST | `/api/v1/payments/webhook` | — | Paystack webhook (HMAC verified) |
| GET | `/api/v1/payments/:reference` | USER | Poll payment status |
| POST | `/api/v1/reviews` | USER | Leave a review (completed bookings only) |
| POST | `/api/v1/push/subscribe` | JWT | Subscribe to Web Push |
| POST | `/api/v1/gift-vouchers` | USER | Purchase a gift voucher |
| POST | `/api/v1/gift-vouchers/:code/redeem` | USER | Redeem a voucher |
| GET | `/api/v1/admin/analytics` | ADMIN | Platform analytics |
| GET | `/api/v1/admin/stylists` | ADMIN | List all stylists |
| PATCH | `/api/v1/admin/stylists/:id/status` | ADMIN | Approve / reject / suspend stylist |
| GET | `/api/v1/admin/users` | ADMIN | List all users |
| PATCH | `/api/v1/admin/users/:id/role` | ADMIN | Change user role |
| GET | `/health` | — | Liveness probe |
| GET | `/ready` | — | Readiness probe (DB + Redis) |

---

## Scalability Considerations

The architecture supports horizontal scaling with intentional design decisions:

- **Stateless API servers** — access tokens verified without a DB lookup; only refresh token validation hits Redis
- **Redis-backed rate limiting** — rate limit state shared across API instances via `rate-limit-redis`
- **Redis-backed session store** — refresh tokens in Redis enable fast revocation without DB writes on every request
- **Socket.io horizontal scaling** — connection topology centralized in `realtime/io.ts`; a Redis adapter can be dropped in for multi-instance deployments
- **Background jobs** — claim-before-act patterns are safe under concurrent runs; production can move to BullMQ + Redis
- **Cloudinary CDN** — all user-uploaded media served from the edge; no binary storage in DB or filesystem
- **Prisma connection pool** — built-in pool per instance; PgBouncer can be added as a drop-in for higher concurrency
- **Turborepo** — parallel package builds in CI; changed-only rebuilds via content hashing

---

## Future Roadmap

Based on the current architecture, the natural next phases are:

- [ ] Earnings & payouts dashboard — stylist withdrawal requests, Paystack Transfer integration
- [ ] Reviews — stylist response to customer reviews
- [ ] Repeat booking — one-click rebook from booking history
- [ ] Availability calendar — visual weekly slot editor for stylists
- [ ] Multi-location support — stylists with multiple studio locations
- [ ] Promo codes & discounts — platform-wide or stylist-specific codes
- [ ] Admin refund workflow — trigger Paystack refund for eligible bookings
- [ ] OpenAPI / Swagger documentation — generated from route layer
- [ ] BullMQ job queue — replace in-process cron jobs with persistent queue

---

## Technical Highlights

This project demonstrates a senior-level understanding of full-stack product engineering:

**Architecture:** Strict 5-layer separation (route → controller → service → repository → database) enforced across the codebase. Services are pure TypeScript with zero Express imports — fully testable in isolation. Repositories are the only files that call Prisma.

**Concurrency Safety:** Double-booking prevented by DB-level unique constraints, not optimistic read-then-write checks. Gift voucher redemption uses atomic claim patterns. Payment confirmation is idempotent end-to-end via `paystackEventId`.

**Security:** JWT rotation, bcrypt cost-12 hashing, HMAC webhook verification, strict CORS, helmet headers, rate limiting at both route and global levels, no PII in logs, immutable audit trail for every security event.

**Observability:** Correlation IDs via `AsyncLocalStorage` thread through every log line across the full request lifecycle — no need to pass `req` through service layers. Structured JSON logs. Sentry on both server and client. Distinct `/health` vs `/ready` endpoints for LB probes.

**Testing:** Integration tests run against real PostgreSQL 16 and Redis 7 in CI — no database mocks. Background jobs exported as plain functions for unit testing without a scheduler. React hooks tested with Testing Library. Playwright for E2E.

**PWA Engineering:** Serwist service worker with per-route caching strategies (stale-while-revalidate for catalogue, network-only for PII, cache-first for static assets), Background Sync for offline mutations, VAPID push, maskable icons, graceful stale-worker cleanup. Service worker disabled in development to avoid HMR interference.

**Developer Experience:** Turborepo for parallel, cached CI pipelines. Shared Zod schemas between frontend and backend eliminate type drift at the boundary. pnpm workspaces with a frozen lockfile for reproducible installs. Conventional Commits enforced across the team.

---

## Data Privacy & Compliance

Glamly handles personal data of Nigerian users under **NDPR (Nigeria Data Protection Regulation)** and GDPR-style principles:

- Minimum PII collection — only what is strictly required for the booking transaction
- No card data stored — Paystack holds all payment instrument data
- Log scrubbing — PII (email, phone, name) never written to logs; only user IDs
- Soft deletes — `deletedAt` timestamps on users and stylists; hard-delete/anonymize on verified right-to-erasure requests
- Immutable audit log — every security-relevant event recorded with who, what, and when
- Token retention — expired refresh tokens purged by daily cron job
- No secrets in repo — env vars validated on boot; CI uses stub values

---

## Development Approach

This project was built using modern software engineering practices and leveraged AI-assisted development tools for productivity enhancement, debugging support, documentation assistance, code review, and accelerated development workflows. All architectural decisions, integration choices, concurrency analysis, security design, testing strategy, and final engineering decisions were validated and owned by the developer.

---

## Author

**Adeniran Israel**  
*Full Stack Developer*

Adeniran Israel is a Full Stack Developer specializing in building production-grade web applications and marketplace platforms. With a strong focus on TypeScript, modern React patterns, and scalable Node.js backends, he designs systems that balance developer ergonomics, security, and real-world performance requirements.

His work spans the full product lifecycle — from database schema and API design through frontend architecture, DevOps pipelines, and observability — with a particular interest in building for emerging markets where reliability, offline resilience, and mobile performance are first-class requirements.

**Areas of focus:**
- Full-stack TypeScript application development
- Marketplace and booking platform architecture
- Progressive Web App engineering
- API design, security, and observability
- Startup-velocity product development

---

<div align="center">

Built with passion for the Nigerian beauty market 💜

</div>
