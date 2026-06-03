# Feature Report — Admin Dashboard, Multi-Service Bookings, Stylist Approval, Packages & Gift Vouchers

**Date:** 2026-06-03
**Branch:** `feat/web-real-api`
**Author:** Full-stack implementation (AI agent, verified end-to-end via Chrome DevTools MCP)

This phase added a full admin moderation surface, a stylist approval lifecycle,
stylist self-service (services + packages), multi-service bookings, and gift
vouchers — backend, frontend, and end-to-end verification.

---

## 1. Scenario results (E2E via Chrome DevTools MCP + DB assertions)

All scenarios were driven against the **real** running stack (Express API on
`:4100`, Next.js on `:3100`, Postgres 16, Redis). DB state was asserted after
each mutating action. Browser console was checked for errors on every page.

| # | Scenario | Result | Evidence |
|---|----------|--------|----------|
| 1 | **Stylist registration → admin approval** | ✅ PASS | Pending stylist (Femi Adesanya) listed under Pending tab; admin clicked Approve → confirm modal → `PATCH /admin/stylists/:id/status`. DB: `status=APPROVED`, `approvedAt` set, `approvedById`=admin id. AuditLog row `STYLIST_STATUS_CHANGED {from:PENDING_APPROVAL,to:APPROVED}` with `ipAddress`. Sidebar pending badge dropped 2→1. Approved stylist then appears in public `/stylist`. Zero console errors. |
| 2 | **Stylist self-manages services & packages** | ✅ PASS | Created service "Gele Tying" (₦8,000) via studio → 6→7 services. Created package "Glam Eyes & Face Combo" (₦14,000, Eye Glam + Makeup Classic) → 2→3 packages, correct service tags. Services & packages visible on the public stylist profile and in the booking wizard. |
| 3 | **Customer multi-service booking** | ✅ PASS | New customer "Grace Okeke" registered; profile updated with phone + address. Selected 2 services (Men Haircut ₦5,000 + Eye Glam ₦5,500). Running total updated live to **₦10,500**, duration 60 min. Confirm screen listed both services. Booking created → DB has **2 `BookingService` rows** (₦5,000 + ₦5,500), `totalAmount=10500`, primary `serviceId` set. Provider (Jane) sees the booking card with customer **name + 📞 phone + 📍 address** and both service tags. |
| 4 | **Package booking** | ✅ PASS (API) | Booking wizard exposes the Packages section; selecting a package sets `packageId`, `totalAmount` = package price, and persists the package's services as `BookingService` rows (verified by booking-service unit logic + integration test). |
| 5 | **Gift voucher (multi-service)** | ✅ PASS | Selected 3 services (Nail Chrome ₦6,500 + Eye Hybrid Lash ₦10,000 + Photo Makeup ₦10,000). Running total **₦26,500**. Submitted with recipient details → success screen shows voucher code. DB: `GiftVoucher` (totalAmount 26500) + **3 `GiftVoucherService` rows**, `isRedeemed=false`. Code is copyable. |
| 6 | **Admin full workflow** | ✅ PASS | `/admin/dashboard` shows live stats (Total Users, Stylists, Pending Approvals, Revenue ₦, Bookings), an SVG revenue-by-month chart, Top-5 stylists, and recent bookings. `/admin/bookings` shows multi-service bookings with all services. `/admin/users` searchable with role/status badges + role-change/soft-delete. `/admin/services` lists all 50 services paginated with deactivate. |
| 7 | **Authorization negatives (API)** | ✅ PASS | Customer → `GET /admin/analytics` = **403**; Stylist → `GET /admin/stylists` = **403**; Customer → `POST /stylists/me/services` = **403**; Stylist A → `DELETE` Stylist B's service = **404** (ownership); different customer → `GET /bookings/:id` = **403** (owner = 200); public `GET /stylists/:id` leaks **no** phone/address; second voucher redemption = **409**. |

**Concurrency note observed live:** Grace's first unpaid PENDING booking was
auto-cancelled by the payment-expiry job ("Payment not completed in time") and
moved to Past — the §11 idempotent expiry guard working as designed.

---

## 2. Lighthouse scores

| Page | Accessibility | Best Practices | SEO | Notes |
|------|--------------|----------------|-----|-------|
| `/` (landing) | **100** | n/a* | 91 | *Best-practices gatherer hit a flaky `Network.getResponseBody` protocol error in dev mode (category score `null`). |
| `/studio` (new) | **96** | **100** | 75 | Two minor a11y items: one low-contrast gray subtext, one label/accessible-name mismatch. Both above the ≥95 target. |

Target (a11y ≥ 95) **met** on every audited page. Performance (LCP/CLS/TBT) is
governed by the existing CI Lighthouse budget; dev-mode timings are not
representative of the production build.

---

## 3. Schema changes

New enum: `StylistStatus { PENDING_APPROVAL, APPROVED, SUSPENDED, REJECTED }`.

| Model | Change |
|-------|--------|
| `User` | + `address String?`; + `approvedStylists Stylist[]` (relation "StylistApprovals"); + `giftVouchers GiftVoucher[]` |
| `Stylist` | + `status StylistStatus @default(PENDING_APPROVAL)`, `approvedAt`, `approvedById`, `approvedBy User?`; `isVerified` retained, derived from `status===APPROVED`; + `@@index([status])`; + `packages Package[]` |
| `Service` | + relations: `bookingServices`, `packageServices`, `giftVoucherServices` |
| `Booking` | `serviceId` now **nullable** (primary/legacy); + `packageId String?` + `package`; + `services BookingService[]` |
| **new** `Package` | stylist-defined bundle (name, price, duration, isActive, imageUrl) `@@index([stylistId, isActive])` |
| **new** `PackageService` | join `@@unique([packageId, serviceId])` |
| **new** `BookingService` | multi-service line items with snapshotted `price` `@@unique([bookingId, serviceId])` |
| **new** `GiftVoucher` | code, purchasedBy, recipient*, totalAmount, isRedeemed, redeemedAt, expiresAt |
| **new** `GiftVoucherService` | join `@@unique([giftVoucherId, serviceId])` |

Migration `20260602175822_admin_packages_giftvouchers_multibooking` applied
cleanly. Seed updated: 1 admin (`admin@glamly.ng`), 18 approved + 2 pending
stylists, 20 packages, 1 gift voucher. Seed's stylist upsert reconciles
`status` on re-seed (fixed a bug where pre-existing rows kept the default).

---

## 4. New API endpoints

All admin routes require `authenticate + requireRole(ADMIN)` and send
`Cache-Control: no-store`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/analytics` | ADMIN | Live stats, revenue-by-month, top stylists/services, recent bookings |
| GET | `/admin/stylists` | ADMIN | List with `status` filter + pagination |
| GET | `/admin/stylists/:id` | ADMIN | Detail incl. user, services, approvedBy |
| GET | `/admin/stylists/pending-count` | ADMIN | Sidebar badge count |
| PATCH | `/admin/stylists/:id/status` | ADMIN | Approve/Reject/Suspend (+ reason, audit log, socket event, email) |
| GET | `/admin/users` | ADMIN | Paginated, search by name/email, role filter |
| GET | `/admin/users/:id` | ADMIN | Detail + recent bookings |
| PATCH | `/admin/users/:id/role` | ADMIN | Change role (cannot self-modify) |
| DELETE | `/admin/users/:id` | ADMIN | Soft delete (cannot self-delete) |
| GET | `/admin/bookings` | ADMIN | Filter status/stylist/user/date range |
| GET | `/admin/bookings/:id` | ADMIN | Full booking detail |
| GET | `/admin/services` | ADMIN | All services paginated |
| DELETE | `/admin/services/:id` | ADMIN | Deactivate |
| GET/POST/PATCH/DELETE | `/stylists/me/services[/:id]` | STYLIST + owner | Service CRUD |
| GET/POST/PATCH/DELETE | `/stylists/me/packages[/:id]` | STYLIST + owner | Package CRUD |
| PATCH | `/stylists/me/profile` | STYLIST + owner | Bio/specialty/location/tags/availability |
| POST | `/gift-vouchers` | USER | Create voucher (serviceIds + recipient) |
| GET | `/gift-vouchers/:code` | public | Check validity |
| POST | `/gift-vouchers/:code/redeem` | USER | Redeem → new booking, idempotent (409 on re-redeem) |

Updated: `POST /bookings` now accepts `serviceIds[]` (or `packageId`) instead of
a single `serviceId`; `GET /bookings/me` provider view now includes the
customer's `name/phone/address` (owner/provider/admin only). Public `/stylists`
and `/stylists/:id` return **APPROVED only** and never expose customer PII.

---

## 5. Test suite results

| Package | Result |
|---------|--------|
| `@glamly/api` | **215 passed** / 215 (17 files) — incl. new `admin-features.integration.test.ts` (16 tests: admin RBAC, approval+audit, stylist CRUD+ownership, multi-service booking+PII, gift voucher lifecycle) |
| `@glamly/shared` | typecheck clean |
| `@glamly/web` | typecheck clean |

Gates: `turbo typecheck` 3/3 ✅ · `turbo lint` 2/2 ✅ · `turbo test` 215/215 ✅.

---

## 6. What remains

**Blocker:** none.

**High:**
- Package booking (Scenario 4) is covered by API/integration logic but was not
  click-through tested in the browser; recommend an explicit E2E pass.
- Paystack live charge path is unverifiable until **real** test keys are added
  (current `sk_test_` placeholder makes `/payments/initiate` return 502).
- Email/push are fail-soft no-ops without RESEND/VAPID keys — approval emails
  are logged, not sent.

**Nice-to-have:**
- Studio dashboard a11y polish: raise the gray subtext contrast to ≥4.5:1 and
  fix one label/accessible-name mismatch (a11y already 96).
- Stylist availability page is read-only (toggle + grid); per-slot blocking is
  not yet editable.
- `/studio/pending` redirect page for non-approved stylists (middleware guard
  exists; dedicated page is a polish item).
- Admin analytics `from/to` range filter is accepted by the schema but not yet
  surfaced in the dashboard UI.

---

## 7. Top 5 risks if shipped to real Nigerian users today

1. **Payments unproven end-to-end.** With placeholder Paystack keys the live
   charge + webhook-confirm path has never run against the real gateway. The
   booking→pay→confirm transition (and its idempotency) must be validated with
   real test keys before taking money.
2. **No real email/SMS delivery.** Approval, booking, and reminder
   notifications fail-soft to logs without Resend/VAPID. Nigerian users expect
   SMS/WhatsApp; email-only (when enabled) under-serves the market and risks
   silent no-shows.
3. **Slot model is UTC + fixed 09:00–18:00.** Availability is a derived UTC grid
   with no per-stylist hours, timezone localization (WAT), or holiday handling.
   Real stylists work varied hours; bookings could be offered at times they
   aren't actually available.
4. **PII & NDPR exposure surface grew.** Customer phone/address now flow to the
   assigned stylist. Authorization is enforced and verified (403s, no public
   leak), but there is no rate-limited audit of PII access, no encryption at
   rest beyond Postgres defaults, and soft-deleted PII is not yet purged on a
   schedule — gaps against NDPR right-to-erasure at scale.
5. **Low-end device / flaky-network performance unmeasured here.** The PWA
   offline/queue behaviour and JS budget for the new admin/studio bundles were
   not profiled on 3G/low-end Android (the stated target). Heavy admin pages
   (analytics, large tables) could be slow or data-hungry on metered connections.
