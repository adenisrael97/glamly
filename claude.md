# GLAMLY — Engineering Guide & Project Constitution

> This document is the single source of truth for how Glamly is built. Any code,
> by a human or an AI agent, must conform to the standards below. When in doubt,
> follow this file over habit or convention found elsewhere.

---

## 1. Product Summary

Glamly is a **beauty & booking marketplace** for the Nigerian market (think Booksy /
StyleSeat). Two primary roles transact on the platform:

- **User (customer)** — discovers stylists, books appointments, pays, leaves reviews.
- **Stylist (provider)** — manages a storefront, availability, bookings, and earnings.

The product is delivered as an **installable Progressive Web App (PWA)** backed by a
**REST API**. It must work on low-end Android devices and tolerate flaky networks.

---

## 2. Architecture Overview

Glamly is a **TypeScript monorepo** managed with **pnpm workspaces** + **Turborepo**.

```
glamly/
├── apps/
│   ├── web/      → Next.js 15 (App Router) PWA — the client
│   └── api/      → Express.js REST API — the server
├── packages/
│   ├── shared/   → Zod schemas, types, constants (imported by BOTH apps)
│   └── config/   → shared ESLint + tsconfig presets
└── infrastructure/ → Docker, nginx, db init
```

**Hard rule:** the only contract between `web` and `api` is the `shared` package and
HTTP. The frontend never imports backend code and vice versa.

### Tech Stack (authoritative — do not substitute without updating this file)

| Layer            | Choice                          | Notes                                       |
|------------------|---------------------------------|---------------------------------------------|
| Language         | TypeScript (strict)             | No `any`. No `// @ts-ignore` without reason. |
| Frontend         | Next.js 15 App Router + React 19| Server Components by default.               |
| Styling          | Tailwind CSS                    | No inline styles. Use the `ui/` system.     |
| PWA              | Service Worker (Serwist/Workbox via `@serwist/next`) + Web Manifest | Offline, install, push. Worker source `apps/web/src/app/sw.ts` → built to `public/sw.js`. |
| Data fetching    | SWR                             | `keepPreviousData` to avoid flicker.        |
| Backend          | Express.js                      | Layered: route → controller → service → repo|
| Database         | PostgreSQL 16                   | The only persistence store.                 |
| ORM              | Prisma                          | Migrations are committed and reviewed.      |
| Cache / sessions | Redis                           | Refresh tokens, rate limits, push subs.     |
| Auth             | JWT (access + refresh) + bcrypt | Access in memory, refresh httpOnly cookie.  |
| Validation       | Zod                             | One schema, shared FE + BE.                 |
| Payments         | Paystack                        | Confirm via webhook, never client-trusted.  |
| Email            | Resend + React Email            | Transactional only.                         |
| Realtime         | Socket.io                       | Live availability + booking status.         |
| File storage     | Cloudinary                      | Stylist portfolios & avatars.               |
| Logging          | Winston (pino acceptable)       | Structured JSON in production.              |
| Error reporting  | Sentry (`@sentry/node` + `@sentry/nextjs`) | Opt-in via DSN; tags the correlation id. |
| Testing          | Vitest + Testing Library + Playwright | Unit, integration, E2E.               |
| CI/CD            | GitHub Actions                  | Typecheck + lint + test + build gate.       |

---

## 3. Backend Layering (non-negotiable)

Every backend request flows through clearly separated layers. Each layer has ONE job.

```
HTTP request
  → routes/        (path + middleware wiring only)
  → middleware/    (auth, role, validation, rate limit)
  → controllers/   (parse req, call service, shape response — THIN)
  → services/      (ALL business logic — zero Express imports)
  → repositories/  (ALL database access — only place Prisma is called)
  → PostgreSQL
```

**Rules:**
- Controllers must not contain business logic. They orchestrate.
- Services must not import `express`, `req`, or `res`. They are pure and testable.
- Repositories are the only files allowed to call `prisma.*`.
- Third-party APIs (Paystack, Resend, Cloudinary) live behind `integrations/` wrappers
  so they can be swapped or mocked without touching business logic.

---

## 4. Frontend Conventions

- Route groups separate concerns: `(public)`, `(auth)`, `(protected)`, `(stylist)`.
- `middleware.ts` enforces auth and role on protected groups.
- `components/ui/` = pure, reusable, no domain knowledge.
- `components/features/` = domain-aware, composed from `ui/`.
- All data access goes through `lib/api/*` (a configured Axios client with a refresh
  interceptor) — components never call `fetch` directly.
- Every async surface shows a **skeleton**, never a blank screen or bare spinner.
- All images use `next/image` with explicit dimensions (zero CLS).

---

## 5. PWA Requirements

- Valid `manifest.json` with maskable icons (192/512), screenshots, and shortcuts.
- Service worker built with **Serwist** (`@serwist/next`); source `apps/web/src/app/sw.ts`,
  compiled to `public/sw.js` at build (a **generated, git-ignored artifact**). Caching:
  - Static/immutable build assets (`/_next/static`, fonts, images): cache-first/SWR — safe
    because they are content-hashed and the precache manifest is **revisioned per build**.
  - Pages/navigations: network-first (always fresh HTML); falls back to `/offline`.
  - Public catalogue API GETs (`/stylists`, `/services`, `/packages`, no `Authorization`):
    stale-while-revalidate. **All other `/api/v1` GETs are network-only** (never cached —
    PII + freshness, §10); this explicitly shadows Serwist `defaultCache`'s `/api` rule.
  - Non-auth mutations: network-only, queued via Serwist `BackgroundSyncPlugin` when offline.
- **Always in sync (no stale cache):** the SW is **disabled in development** (HMR is the
  source of truth; `SWDevCleanup` removes any stale worker). In production it uses
  `skipWaiting` + `clientsClaim`, and the client reloads once on `controllerchange`
  (guarded — see `usePWA`) so a new deploy silently replaces the old one. No manual
  "update available" prompt.
- A dedicated `/offline` fallback page. Custom install prompt (`InstallPrompt`).
- Web Push notifications for booking confirmations and reminders (VAPID).
- Must pass a Lighthouse PWA audit (installable + offline-capable).

---

## 6. Security Baseline (must hold at all times)

- Passwords hashed with bcrypt (cost ≥ 12). Never logged, never returned.
- Access tokens short-lived (~15m); refresh tokens rotated and revocable via Redis.
- `helmet`, strict `cors` allowlist (never `*` in production), `express-rate-limit`
  on `/auth/*`.
- All input validated with Zod at the boundary before it reaches a service.
- Paystack webhooks verified by signature; payment state is **idempotent** (a webhook
  firing twice must not double-confirm or double-charge).
- No secrets in the repo. `config/index.ts` validates env on boot and fails fast.
- SQL injection is impossible by construction (Prisma parameterizes); never build raw
  queries from user input.

---

## 7. Coding Standards

- Functional, composable code. Small functions with single responsibility.
- No duplicated logic — extract to `utils/`, `hooks/`, or `services/`.
- Consistent API envelope everywhere: `{ success: true, data }` or
  `{ success: false, error: { message, code } }`.
- Errors are thrown as typed `AppError`s and mapped to HTTP codes by the global
  `errorHandler` — controllers do not write ad-hoc status codes.
- Names describe intent. Comments explain *why*, not *what*.
- Match the style of surrounding code.

---

## 8. Definition of Done (every task)

A change is not "done" until ALL of these are true:

1. ✅ Code compiles with `tsc` — zero type errors, zero `any` introduced.
2. ✅ `pnpm lint` passes with no new warnings.
3. ✅ New logic has tests (unit for services/utils, integration for routes).
4. ✅ Existing tests still pass (`pnpm turbo test`).
5. ✅ The change was **manually verified running** — backend via API call, frontend
   via the **Chrome DevTools MCP** (navigate, interact, check console for errors,
   check network responses).
6. ✅ The diff was **self-reviewed** for bugs, edge cases, and security before being
   declared complete (run `/code-review` mentally or literally).
7. ✅ No console errors in the browser, no unhandled promise rejections in the server.
8. ✅ Docs updated if the API surface or env vars changed.

---

## 9. Workflow Expectations for AI Agents

- Work **phase by phase**. Do not jump ahead. Finish, verify, and review a phase
  before starting the next.
- After writing code, **read it back critically** and fix issues before reporting done.
- Use available **MCP servers** to verify work:
  - **Chrome DevTools MCP** — drive the running web app, assert on UI, console, network,
    and run Lighthouse/PWA audits.
  - **Context7 MCP** — fetch current docs for any library before using its API.
- Never claim something works without having run it. If a step was skipped or a test
  failed, say so plainly with the output.
- Prefer the smallest correct change. Do not introduce libraries not listed in §2
  without explicit approval (and then update this file).

---

## 10. Data Privacy & Compliance

This product handles personal data of Nigerian users — **NDPR (Nigeria Data
Protection Regulation)** and GDPR-style principles apply.

- Collect the minimum PII needed. Never store card data (Paystack holds it).
- PII (email, phone, name, location) is never written to logs. Log user **IDs**, not
  identities. Scrub request bodies in the logger.
- Deletes are **soft** (`deletedAt` timestamp) except on a verified "delete my account"
  request, which hard-deletes/anonymizes per NDPR right-to-erasure.
- An immutable **audit log** records security-relevant events: login, password change,
  role change, payout, booking state transitions. Who, what, when.
- Data retention: refresh tokens purged on expiry; soft-deleted rows purged after a
  defined window via a cron job.

## 11. Concurrency, Consistency & Transactions

Correctness under concurrent load is a senior-level requirement, not an afterthought.

- **No double-booking.** A slot is protected by a DB-level unique constraint on
  `(stylistId, startTime)` AND taken inside a transaction. Rely on the constraint, not
  on a read-then-write check (which races).
- Any operation touching multiple tables that must succeed or fail together runs in a
  **`prisma.$transaction`** (e.g. create booking + create pending payment).
- External side effects (charge, email, push) happen **after** the transaction commits,
  never inside it.
- Mutations that a client may retry accept an **idempotency key**; the payment webhook
  is idempotent by event ID (see §6).

## 12. Performance & Scaling

- **Zero N+1 queries.** Use Prisma `include`/`select` deliberately; never query inside a
  loop. Review every list endpoint for N+1.
- Pagination is **mandatory** on all list endpoints. Default page size 20, hard cap 50.
- Database: every column used in a `WHERE`/`ORDER BY`/join has an index. Use a connection
  pool (PgBouncer or Prisma's pool) sized for the host.
- Caching tiers: hot, rarely-changing reads (service catalogue, stylist list) are cached
  in Redis with a short TTL and explicit invalidation on write.
- **Frontend performance budget** (enforced via Lighthouse in CI): LCP < 2.5s on 4G,
  CLS < 0.1, TBT < 200ms, initial JS < 200KB gzipped. Code-split routes; lazy-load
  below-the-fold sections.

## 13. Observability

- Every request carries a **correlation ID** (`x-request-id`, generated if absent),
  attached to every log line for that request and returned in the response.
- Structured JSON logs in production (Winston). Three levels used deliberately:
  `error` (paging-worthy), `warn` (degraded), `info` (lifecycle).
- **`/health`** (liveness — process up) is distinct from **`/ready`** (readiness — DB +
  Redis reachable). Load balancers use `/ready`.
- A defined **error-code taxonomy** in `shared` (e.g. `AUTH_INVALID_CREDENTIALS`,
  `BOOKING_SLOT_TAKEN`, `PAYMENT_VERIFICATION_FAILED`). Clients branch on `code`, never
  on a human message. Messages never leak stack traces or SQL.
- Errors reported to Sentry with the correlation ID for traceability.

## 14. Accessibility (WCAG 2.1 AA)

- Semantic HTML first; ARIA only to fill gaps, never as a substitute.
- Every interactive element is keyboard-reachable with a visible focus ring; modals trap
  focus and restore it on close.
- All images have meaningful `alt`; decorative images use `alt=""`.
- Color contrast ≥ 4.5:1 for text. Never convey state by color alone.
- Forms: labels tied to inputs, errors announced via `aria-live`.
- Verified with the Lighthouse a11y audit (target ≥ 95) via Chrome DevTools MCP.

## 15. Git & Collaboration Standards

- **Conventional Commits**: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`.
- Branch naming: `feat/booking-payments`, `fix/refresh-token-rotation`.
- **Small, focused PRs** — one concern each. A 2,000-line PR is a red flag, not progress.
- Every PR: descriptive title, what/why in the body, linked phase, screenshots for UI,
  and a green CI check. PRs do not merge red.
- Never commit secrets, `.env`, or generated artifacts. Commit lockfiles and migrations.

## 16. Documentation & Decision Records

- **Architecture Decision Records** live in `docs/adr/NNNN-title.md` — one per significant
  choice (why PostgreSQL over Mongo, why JWT+refresh over sessions, why monorepo, why
  Paystack). Format: Context → Decision → Consequences. *These are your interview answers,
  written down.*
- The API is documented (OpenAPI/Swagger generated from the route layer) and kept current.
- `README.md`: what it is, architecture diagram, one-command local setup, and the live URL.

## 17. Database Migration Safety

- Migrations are **forward-only and reviewed** like code. Never edit an applied migration.
- Destructive changes use **expand–contract**: add new → backfill → switch reads/writes →
  remove old, across separate deploys. Never drop a column an old deploy still reads.
- Every migration must be runnable on a populated database without data loss.

## 18. Migration Note

This repo began as a **frontend-only mock** (localStorage "auth", JSON "database").
The goal is to evolve it into the full-stack system described above **without breaking
the existing UX**. Replace mocks layer by layer; keep the app runnable at every commit.
