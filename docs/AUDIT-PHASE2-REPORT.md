# Glamly — Pre-Production Audit (Phase 2)

**Date:** 2026-06-03
**Branch:** `feat/web-real-api`
**Method:** Live drive of the running production build via Chrome DevTools MCP + curl + direct Postgres queries. No simulated results; every PASS was observed.

> **Runtime note (important):** Both apps are running **production builds**, not dev servers.
> API = `node dist/index.js` (env: `DATABASE_URL=…@localhost:5432/glamly`, `REDIS_URL=…:6379`,
> `PORT=4100`, `CORS_ORIGINS=http://localhost:3100,…`, `NODE_ENV=development`).
> Web = `next start -p 3100` from `.next`. Therefore code fixes require **rebuild + restart**
> (shared→dist, api→dist+restart, web→next build+restart; `public/sw.js` is served statically so
> it updates without a Next rebuild). Fixes are batched to minimise rebuilds.

---

## 1. BOOT STATUS

Stack started cleanly and is healthy:

| Component | Port | Status |
|-----------|------|--------|
| API `/health` | 4100 | ✅ `{success:true,data:{status:"ok"}}` |
| API `/ready`  | 4100 | ✅ `db:"ok", redis:"ok"` |
| Web | 3100 | ✅ 200 |
| PostgreSQL | 5432 | ✅ (db `glamly`, seeded) |
| Redis | 6379 | ✅ |

Chrome DevTools MCP: a leftover Chrome from a prior session was holding the MCP profile
(`chrome-devtools-mcp/chrome-profile`); terminated it so the MCP could attach. Then connected fine.

DB snapshot at start: 38 users, 22 stylists (20 APPROVED / 2 PENDING_APPROVAL), 53 services,
22 packages, 17 bookings, 3 gift vouchers, 1028 audit-log rows. Credentials (seed): all accounts
`Password123!`; admin `admin@glamly.ng`; customers `ada@glamly.ng` etc.; stylists
`first.last@stylist.glamly.ng`; pending `tola.ogundimu@stylist.glamly.ng`, `femi.adesanya@stylist.glamly.ng`.

---

## 2. STATIC / RUNTIME DEFECT LOG

| # | Location | Severity | Root cause | Fix |
|---|----------|----------|------------|-----|
| D1 | `apps/web/public/sw.js:87-88` (`staleWhileRevalidate` over all API GETs) | **HIGH** | Per-user authenticated API GETs (`/bookings/me`, `/bookings/:id` — carry customer name/phone/address) are cached in shared `glamly-api-v1` keyed by URL only, with no Authorization awareness and no clear-on-logout. On a shared device or after logout the SW serves another session's cached PII; also returns stale 200s when the token is invalid. NDPR §10 / §5 caching-correctness. | ✅ **FIXED** (this pass): `sw.js` now caches only public catalogue GETs (`isPublicCatalogGet`: `/stylists` [excl. `/stylists/me`], `/services`, `/packages`, and only without an `Authorization` header); all authenticated/per-user GETs are network-only; cache bumped `v1→v2` so the old PII cache is purged on activate. **Verified live:** `/stylists` cached in `glamly-api-v2`, `/bookings/me` NOT cached, `glamly-api-v1` gone. (Static file — no Next rebuild.) |
| D2 | `apps/api/src/routes/v1/auth.routes.ts` + web dashboard | **HIGH** | No customer profile-management: no `PATCH /auth/me` (routes are only register/login/refresh/logout/`GET /me`), no profile UI on `/dashboard`, and `GET /me`/`AuthUser` omit phone & address. A newly-registered customer cannot set phone/address — which the booking flow needs (stylist must see customer phone+address, Scenario 4g). | PENDING (batch): add shared `updateProfileSchema`, repo `updateProfile`, service+controller, `PATCH /auth/me`; extend `AuthUser` with phone/address; add a Profile section to `/dashboard`. |
| D3 | `apps/web/src/app/(auth)/register/page.tsx:73` | LOW | `phone` field kept in form state but never rendered (dead state). | PENDING (batch): remove dead field. |
| D4 | `apps/web/src/app/(auth)/register/page.tsx:48-53` | LOW | After customer registration the page shows a success card with **"Explore Services" → `/`** and does **not** redirect to `/dashboard` (Scenario 1a expects dashboard). User IS authenticated, so functional, but deviates from spec and the CTA points to home not `/services`. | OPEN (UX decision — see report §7). |
| D5 | `apps/web/src/app/(stylist)/layout.tsx` + `studio/page.tsx:87-90` + `apps/api/.../auth.service.ts:toAuthUser` | **HIGH** | No stylist-status gating. `studio/page.tsx` reads `user.stylistStatus` to show a "pending approval" banner, but `AuthUser`/`toAuthUser` never carry `stylistStatus` (confirmed: stylist login payload has no such field) → banner is **dead code, never renders**. No `/studio/pending` route exists. The stylist layout gates only on auth+role. Net: a **PENDING or SUSPENDED** stylist gets **full studio access with zero status indication**; Scenario 2c/2h/7d/8g cannot pass. (Backend correctly blocks non-APPROVED stylists from being booked/listed, so impact is UX/trust + missing suspend-eviction.) | PENDING (batch): embed `stylistStatus` on `AuthUser`; add `/studio/pending`; redirect non-APPROVED stylists there from the stylist layout. |
| D6 | `apps/web` InstallPrompt (fixed bottom banner) vs `stylist-register` nav buttons | MEDIUM | The fixed "Add Glamly to your home screen" install banner overlaps the bottom-of-viewport **Next/Submit buttons** on the stylist onboarding wizard, intercepting clicks (confirmed via `elementFromPoint`). Dismissing the banner restored clickability. Blocks form completion until dismissed; likely affects other bottom-anchored CTAs. | PENDING (batch): ensure the install banner does not overlay interactive content (offset content / lower z-index / safe-area padding). |
| D7 | stylist registration (`register` endpoint) | MEDIUM | Onboarding collects bio, experience, instagram, portfolio but the register endpoint persists only specialty/location/priceFrom; bio/experience/portfolio are **discarded** (acknowledged in code comment). Admin profile + public profile therefore show "Experience —" and no bio/portfolio for self-registered stylists. No studio UI to set them later. | OPEN — see §7 (needs stylist profile-edit UI wired to existing `stylist-me` update). |

---

## 3. API VERIFICATION (observed during the live drive)

| Endpoint group | Result | Evidence (status + envelope) |
|----------------|--------|------------------------------|
| `POST /auth/register` | ✅ PASS | 201 `{success,message,data:{user,accessToken,expiresIn}}`; rows created. |
| `POST /auth/login` | ✅ PASS | 200 same envelope; httpOnly refresh cookie; `glamly_role` hint. |
| `POST /auth/refresh` | ✅ PASS | 200 new access token (single-flight; drives silent retry). |
| `POST /auth/logout` | ✅ PASS | 200; cookie cleared; idempotent. |
| `GET /auth/me` | ✅ PASS | 200 (but omits phone/address — D2). |
| `GET /stylists` (list/search) | ✅ PASS | 200 paginated `{items,meta}`; APPROVED-only; search by name/specialty/location (not service names — D10). |
| `GET /stylists/:id` | ✅ PASS | 200 for APPROVED w/ services+packages; **404** for pending/suspended. |
| `GET /stylists/:id/availability` | ✅ PASS | 200 slot grid; honours existing bookings. |
| `GET/POST/PATCH/DELETE /stylists/me/services` | ✅ PASS | 200/201; DB writes; ownership-scoped (foreign → 404). |
| `GET/POST /stylists/me/packages` | ✅ PASS | 201 + `package_services` rows; independent price. |
| `PATCH /stylists/me` (availability) | ✅ PASS (via toggle path) | used by availability toggle; UI can't reach it without a booking — D9. |
| `POST /bookings` | ✅ PASS | 201; multi-service + package; `booking_services` rows; **409 `BOOKING_SLOT_TAKEN`** on conflict. |
| `GET /bookings/me` | ✅ PASS | 200 `{items,meta,view}`; **401** unauth. |
| `GET /bookings/:id` | ✅ PASS | 200 with `user.phone/address` + `services[].service` for the assigned stylist; **403** for a non-owner. |
| `GET /admin/dashboard` | ✅ PASS | 200 real aggregates; **403** for USER/STYLIST. |
| `GET /admin/stylists` (+ `/pending-count`, `/:id`) | ✅ PASS | 200; **403** for non-admin. |
| `PATCH /admin/stylists/:id/status` | ✅ PASS | 200; DB status + `approvedAt`/`approvedById`; audit row; email hook fired. |
| `GET /admin/users` | ✅ PASS | 200 paginated with booking counts + name search. |
| `GET /admin/bookings` | ✅ PASS | 200 with service-name list. |
| `GET /admin/services` + deactivate | ✅ PASS | 200; deactivate flips `isActive` → removed from public profile. |
| `POST /gift-vouchers` | ✅ PASS | 201 + 3 `gift_voucher_services` rows. |
| `POST /gift-vouchers/:code/redeem` | ✅ PASS | 201 booking on first; **409 `GIFT_VOUCHER_ALREADY_REDEEMED`** on second (atomic). |
| `GET /health`, `/ready` | ✅ PASS | 200; `/ready` reports db+redis ok. |
| `payments/*` (Paystack init/verify/webhook) | ⏸ **UNVERIFIED** | No `PAYSTACK`/test key in this env; booking stays "Awaiting payment". Webhook idempotency not exercised live. |
| `reviews/*`, `push/*` | ⏸ NOT EXERCISED | Out of scenario scope; seed data shows reviews wired. |

Cross-cutting: every response carried `x-request-id`, strict security headers (CSP, HSTS, `X-Content-Type-Options`,
CORS locked to `http://localhost:3100`), `Cache-Control: no-store` on auth, and rate-limit headers on `/auth/*`.

## 4. E2E SCENARIO RESULTS

### Scenario 1 — Customer Registration & Profile

| Step | Result | Evidence |
|------|--------|----------|
| 1a Register | ✅ PASS (with notes) | `POST /api/v1/auth/register` → **201**, envelope `{success,message,data:{user,accessToken,expiresIn:900}}`; DB row created (role USER, isVerified false); `glamly_role=user` cookie set; strong headers (CSP, HSTS, CORS=localhost:3100, rate-limit). **Note:** stays on `/register` showing a success card (no dashboard redirect — D4); registration collects only name/email/password (no phone/address — see D2). |
| 1b Profile shows name/phone/address + edit address (PATCH) | ❌ **FAIL / NOT IMPLEMENTED** | No profile section on `/dashboard` (bookings only); account menu has only Dashboard/Sign out; no `PATCH` profile endpoint; `GET /me` omits phone/address. See **D2**. |
| 1c Logout → protected redirects to login | ✅ PASS | Sign-out (account menu) → navigates to `/`; then `GET /dashboard` redirects to `/Login?next=%2Fdashboard`. |
| 1d Log back in | ✅ PASS | `POST /api/v1/auth/login` → **200**, correct envelope; redirected to `/dashboard` (honoured `next`); `glamly_role=user` set; refresh cookie httpOnly (session restores on reload). |
| 1e 401 → silent refresh + retry | ✅ PASS | API correctly returns **401 `AUTH_TOKEN_INVALID`** on bad/missing token (curl + SW-bypass); `POST /auth/refresh` → 200 + new access token; retry with fresh token → 200. Proactive single-flight silent refresh observed firing on first load (`POST /auth/refresh` 200, session restored, no user-visible error). Interceptor code (`lib/api/client.ts`) verified: single-flight, `_retry` once, auth-flow excluded. **Caveat:** discovered D1 — the SW served a cached 200 for a bad-token request until its cache was bypassed. |

**Scenario 1 verdict:** core auth (register/login/logout/refresh/interceptor) is solid and secure. Two
real gaps: **D2** (no customer profile management — blocks 1b and weakens 4g) and **D1** (SW caches PII).

### Scenario 2 — Stylist Registration → Pending → Admin Approval

| Step | Result | Evidence |
|------|--------|----------|
| 2a Register stylist (4-step wizard) | ✅ PASS | `POST /auth/register` → **201**; DB `stylists` row `status=PENDING_APPROVAL`, specialty Braiding, Lekki, ₦8000; `USER_REGISTERED` audit row. Wizard worked once the install banner was dismissed (see D6). |
| 2b New stylist NOT in public search | ✅ PASS | `GET /stylists?limit=50` → 20 rows, **all APPROVED**, pending id absent. `?q=braid` also excludes it (but see note: `q` did not filter — Scenario 4). |
| 2c `/studio` → redirect to `/studio/pending` | ❌ **FAIL** | Pending stylist landed on full Studio Overview; all studio sub-pages (services/packages/bookings/availability) returned 200; no pending banner, no redirect, no `/studio/pending` route. See **D5**. |
| 2d Admin → `/admin/stylists` pending badge + open profile | ✅ PASS | Sidebar "Stylists **3**" badge; breadcrumb shows "3 stylists pending approval"; new stylist listed under Pending with View/Approve. |
| 2e Full profile renders | 🟡 PARTIAL | Specialty/Location/Services(0)/Account(name,email,phone) render; **bio/portfolio/experience empty** (not persisted at registration — **D7**). |
| 2f Approve (modal + note) | ✅ PASS | Modal `dialog "Approve Stylist?"` (focus on Cancel); `PATCH /admin/stylists/:id/status` → **200** (reqid 435); DB `APPROVED` + `approvedAt` + `approvedById`=admin; `STYLIST_STATUS_CHANGED` audit row; **approval email path fired** (`Email skipped — RESEND_API_KEY not configured {subject:"Your Glamly profile is approved! 🎉"}`, correlation id attached — correct for keyless env). |
| 2g Sticky topbar breadcrumb "Stylists", pinned | ✅ PASS (positioning) | Desktop topbar computed `position:sticky; top:0; z-index:20`; breadcrumb = "Stylists". Page too short to scroll here; full top/mid/bottom scroll proof in Scenario 9. |
| 2h Approved stylist `/studio` loads | ✅ PASS | `/studio` → Studio Overview, no redirect. |
| (8h) Pending stylist detail → 404 | ✅ PASS | `GET /stylists/{pendingId}` → **404 NOT_FOUND**. |

**Scenario 2 verdict:** backend approval pipeline is excellent (atomic update, audit log, email hook, correct
public-visibility gating, interceptor-driven 401→refresh→retry seen live). The one real failure is **D5**
(frontend never learns stylist status → no pending gate/indicator). Plus D6 (install-banner overlap) and
D7 (registration drops bio/experience/portfolio).

### Scenario 3 — Stylist Services & Packages

| Step | Result | Evidence |
|------|--------|----------|
| 3a Add "Box Braids" (Hair, ₦15000, 180) | ✅ PASS | `POST /stylists/me/services` → **201** (reqid 512); DB row created. |
| 3b Add Knotless Braids (₦18000) + Cornrows (₦8000) | ✅ PASS | DB shows all 3 active services; UI list (after fresh fetch) shows 3. |
| 3c Create package Box Braids + Cornrows (₦20000/240) | ✅ PASS | `POST /stylists/me/packages` → **201** (reqid 706); DB package + `package_services` rows for both. |
| 3d Edit Box Braids → ₦16000; package price independent | ✅ PASS | `PATCH /stylists/me/services/:id` → **200** (reqid 744); DB price=16000; package still ₦20,000 (independent). |
| 3e Guest profile: 3 services + package + priceFrom | ✅ PASS | Guest (isolated ctx, not logged in) `/stylist/:id` → services Cornrows ₦8,000 / Box Braids ₦16,000 / Knotless ₦18,000; PACKAGES "Box Braids + Cornrows" ₦20,000; "From ₦8,000". Public API matches. **Nuance:** `priceFrom` is the stylist's stored value (₦8,000) — it is **not auto-derived** from the cheapest active service (coincidentally equal here). |
| 3f Studio sidebar pinned on scroll | ✅ PASS (positioning) | Sidebar `<aside>` is `position:fixed inset-y-0 z-30`; full scroll screenshots in Scenario 9. |

**New defects from Scenario 3:**

| # | Location | Severity | Root cause | Fix |
|---|----------|----------|------------|-----|
| D8 | D1 functional impact (`sw.js` SWR over `/stylists/me/*`) | HIGH (part of D1) | Immediately after `POST/PATCH`, the studio list showed **stale** data (e.g., "0 services" after creating one) because the SW served the cached pre-mutation GET. Mutations don't reflect until the SW cache revalidates + the app refetches. | Folded into **D1** fix (don't cache authenticated/mutable GETs). |
| D9 | `apps/web/.../studio/availability/page.tsx:186-208` (+ studio overview same pattern) | MEDIUM | Stylist's own `stylistId` is derived from `bookings[0]?.stylistId`. A stylist **with no bookings** → `stylistId=null` → availability grid hidden and the toggle's `effectiveIsAvailable` defaults to **false** regardless of the true DB value. New/approved stylists can't see/manage availability until they have a booking, and the shown status can be wrong. (Booking service blocks `!isAvailable`, so this can silently make a stylist unbookable.) | Use the stylist's own profile (`GET /stylists/me`) for id + `isAvailable` instead of inferring from bookings. |

**Scenario 3 verdict:** services/packages CRUD is fully functional end-to-end (real API, DB rows, independent
package pricing). Two cross-cutting issues surfaced: **D1/D8** (SW staleness hides just-made changes) and
**D9** (availability unmanageable without a booking; this stylist's `isAvailable` was stuck false until set
via DB for test continuity).

### Scenario 4 — Customer Multi-Service Booking + Double-Booking Guard

| Step | Result | Evidence |
|------|--------|----------|
| 4a Log in as customer | ✅ PASS | `POST /auth/login` 200. |
| 4b Search "braids" → stylist appears with location + priceFrom | ❌ **FAIL (as written)** / ✅ with "braid" | `GET /stylists?search=braids` → **0 results**. Search matches name/specialty/location substrings only — **not service names**, and no plural/stemming ("braids" ≠ "Braiding"). With `search=braid`/`Braiding` the audit stylist appears with **Lekki** + **₦8,000**. See **D10**. |
| 4c Profile → Book | ✅ PASS | Profile (now "Available") → "Book Appointment" → `/book-appointment?stylistId=…` wizard. |
| 4d Select Box Braids + Cornrows → ₦24,000 | ✅ PASS | "2 services selected · 270 min · Total **₦24,000**" (₦16,000+₦8,000). |
| 4e Pick slot + notes → create | ✅ PASS | `POST /api/v1/bookings` → **201** (API log); DB booking total 24000, status PENDING, Thu 4 Jun 10:00, notes saved, **2 `booking_services`** (Cornrows ₦8,000 + Box Braids ₦16,000), `packageId` null. (Payment row is created at the Paystack step — **UNVERIFIED**, no test key; slot held while pending per design.) |
| 4f Dashboard shows booking | ✅ PASS | "Box Braids · Cornrows with Audit Stylist One · Lekki · Thu, 4 Jun, 10:00 · Awaiting payment · ₦24,000". (Cosmetic: card title repeats the first service.) |
| 4g Stylist sees customer name + phone + address; API includes them | ✅ PASS | `GET /bookings/:id` (stylist token) → `user.name/phone/address` all present + `services[].service.name`. Studio Pending tab renders "Audit Customer One 📞 +2348012345678 📍 12 Admiralty Way…", both services, ₦24,000. |
| 4h Different user, same slot → 409 | ✅ PASS | `POST /bookings` (mike@glamly.ng, same `stylistId`+`startTime`) → **409 `BOOKING_SLOT_TAKEN`**; first booking unaffected (PENDING, ₦24,000). Unique-constraint + transaction guard works. |

**New defect:**

| # | Location | Severity | Root cause | Fix |
|---|----------|----------|------------|-----|
| D10 | stylist search (`?search=`) repo/service | MEDIUM | Search matches only stylist name/specialty/location substrings — **service names are not searchable** (a customer searching "Box Braids"/"knotless" gets 0) and there's no plural/stemming ("braids"→0, "braid"→3). Poor discovery for a service marketplace. | Extend search to include service names (join) and/or normalise plurals; at minimum index service.name for search. |

**Scenario 4 verdict:** the core booking pipeline is excellent — multi-service totals correct, real `POST /bookings`
→ 201 with `booking_services` rows, dashboard + studio reflect it, **the assigned stylist correctly sees customer
PII (name/phone/address)**, and the **double-booking guard returns 409 `BOOKING_SLOT_TAKEN`** without touching the
first booking. The one functional miss is **D10** (search doesn't find by service name/plural, so the literal
"braids" query fails). Required test-data setup due to **D2** (customer phone/address) and **D9** (availability).

### Scenario 5 — Package Booking

| Step | Result | Evidence |
|------|--------|----------|
| 5a Select package → ₦20,000, individual deselected | ✅ PASS | Selecting an individual service then the package → only the package is `aria-pressed`; total switches to **₦20,000** ("Package selected · 240 min"). |
| 5b Complete booking → packageId + total 20000 | ✅ PASS | `POST /bookings` (packageId) → booking `cmpyb8y6c…`: `packageId`→"Box Braids + Cornrows", total **20000**, PENDING, Fri 5 Jun; 2 `booking_services` rows materialised for fulfillment. Availability correctly blocked Thu's early slots due to the prior booking. |
| 5c Stylist sees the **package name**, not individual services | ❌ **FAIL** | Studio booking card shows individual services "Cornrows · Box Braids" (title "Cornrows"), **not** the package name "Box Braids + Cornrows", though the API returns the `package` object. See **D11**. Customer name/phone/address + ₦20,000 all correct. |

**New defect:**

| # | Location | Severity | Root cause | Fix |
|---|----------|----------|------------|-----|
| D11 | `BookingCard` (studio + dashboard) | LOW–MEDIUM | For package bookings the card renders the constituent `booking_services` instead of the `package.name` returned by the API. Package context is lost in both stylist + customer views (info is not wrong, just mislabelled). | When `booking.package` is present, show the package name (optionally with constituent services as a sub-line). |

**Scenario 5 verdict:** package booking is correct at the data layer (packageId persisted, independent ₦20,000
price, constituent services recorded, availability honoured). The only gap is presentational — **D11**, the
package name isn't shown on the booking card (5c).

### Scenario 6 — Gift Voucher (Multi-Service) + Redeem + Double-Redeem

| Step | Result | Evidence |
|------|--------|----------|
| 6a Select Box Braids + Knotless + Cornrows → ₦42,000 | ✅ PASS | Running "Total **₦42,000**" (₦16k+₦18k+₦8k), 3 services `aria-pressed`. Gift form lists all active services. |
| 6b Recipient name/email/phone + message | ✅ PASS | Fields filled and retained across re-render. |
| 6c Submit → 201, voucher + 3 service rows, code + copy button | ✅ PASS | `POST /gift-vouchers` → **201**; success screen "Total value ₦42,000", "Copy code" button; DB voucher (total 42000, `isRedeemed=false`) + **3 `gift_voucher_services`** rows. **Nit (D13):** the displayed/stored `code` is a raw CUID, not a human-friendly code — hard to share/type. |
| 6d Redeem the voucher → isRedeemed=true, redeemedAt set | ✅ PASS (API) / ❌ no UI | **No `/gift-service/redeem` page exists** (only the gift form). Redeemed via `POST /gift-vouchers/:code/redeem` (auth) → **201**, booking created (3 services, ₦42,000, Sat 6 Jun), `voucher.isRedeemed=true`, `redeemedAt` set. See **D12**. |
| 6e Redeem same code again → already redeemed | ✅ PASS | Second redeem → **409 `GIFT_VOUCHER_ALREADY_REDEEMED`** (atomic claim guard). |

**New defects:**

| # | Location | Severity | Root cause | Fix |
|---|----------|----------|------------|-----|
| D12 | web `gift-service` (no redeem route) | MEDIUM | Redemption exists only as an API (`POST /gift-vouchers/:code/redeem`). There is **no frontend page** for a recipient to enter a code and redeem — the feature is unreachable through the app. | Add a `/gift-service/redeem` page (enter code → look up via `GET /gift-vouchers/:code` → pick stylist/slot → redeem). |
| D13 | gift voucher `code` generation | LOW | Voucher `code` is a CUID (`cmpybeh940073q02grgsil6gv`) — not human-friendly for sharing/typing. | Generate a short readable code (e.g. `GLAM-XXXX-XXXX`), unique-indexed. |

**Scenario 6 verdict:** the gift-voucher backend is robust — multi-service total, 201 create with service rows,
**atomic single-redeem guard returning 409 on re-redeem**, expiry check, and booking creation on redeem. Gaps are
frontend (**D12** no redeem UI) and a code-format nit (**D13**).

### Scenario 7 — Admin Full Workflow

| Step | Result | Evidence |
|------|--------|----------|
| 7a Dashboard stat cards + revenue chart + top stylists | ✅ PASS | Users 16 / Stylists 23 / Pending 2 / Revenue ₦390,500 / Bookings 20 — **no NaN/undefined/zero**; revenue chart renders (axis 0→364k, May/Jun); Top-5 Stylists + Recent Bookings populated (incl. audit ₦42k/₦20k/₦24k). |
| 7b Scroll dashboard — topbar + sidebar pinned, breadcrumb "Dashboard" | ✅ PASS | Breadcrumb "Dashboard"; topbar `position:sticky`, sidebar `position:fixed`. Full top/mid/bottom screenshots → Scenario 9. |
| 7c /admin/stylists breadcrumb + Approved tab | ✅ PASS | Breadcrumb "Stylists"; Approved tab includes Audit Stylist One. |
| 7d Suspend (reason) → SUSPENDED + audit + search-gone + studio-evict | 🟡 PARTIAL | Modal requires a reason (Suspend disabled until filled). DB `SUSPENDED`+`isVerified=false`; `STYLIST_STATUS_CHANGED→SUSPENDED` audit row; removed from `GET /stylists`; detail → 404. **BUT** suspended stylist still reached `/studio/bookings` with no redirect/notice — **D5** again. |
| 7e Re-approve → APPROVED, back in search | ✅ PASS | `PATCH …/status` 200; DB APPROVED+verified; present in `GET /stylists`. |
| 7f /admin/users search by name → booking count | ✅ PASS | Search "Audit Customer" → 1 row (Audit Customer One, **Bookings = 3**); stylist filtered out. |
| 7g /admin/bookings multi-service booking shows both services | ✅ PASS | Row "Audit Customer One · Audit Stylist One · **Box Braids, Cornrows** · ₦24,000 · PENDING". (Package booking shows constituent services — D11.) |
| 7h /admin/services deactivate Box Braids → isActive=false, gone from profile | ✅ PASS | Confirmation modal (good UX) → DB `isActive=false`; public profile dropped Box Braids (Cornrows+Knotless remain). (Re-activated afterward to restore test data.) |

**Scenario 7 verdict:** the admin console is strong — real aggregate stats, revenue chart, populated tables,
working suspend/re-approve with **required reason + audit logging + correct public-visibility toggling**, user
search with booking counts, booking service-name display, and service deactivation with confirmation. The lone
failure is the **D5** consequence: a SUSPENDED stylist is not evicted from `/studio` (no client/route status gate).

### Scenario 8 — Authorization & Security Negatives

All API checks via curl (bypasses the SW cache). Every error returns the correct code with **no internal/stack/SQL leak**.

| Step | Expected | Result |
|------|----------|--------|
| 8a Unauthenticated `GET /bookings/me` | 401 | ✅ **401** `AUTH_UNAUTHORIZED` |
| 8b USER `GET /admin/dashboard` | 403 | ✅ **403** `AUTH_FORBIDDEN` |
| 8c STYLIST `GET /admin/stylists` | 403 | ✅ **403** `AUTH_FORBIDDEN` |
| 8d USER `POST /stylists/me/services` | 403 | ✅ **403** `AUTH_FORBIDDEN` |
| 8e USER A `GET /bookings/:id` (User B's) | 403 | ✅ **403** `AUTH_FORBIDDEN` |
| 8f STYLIST A `DELETE /stylists/me/services/:id` (Stylist B's) | 403/404 | ✅ **404** `NOT_FOUND` (ownership-scoped) |
| 8g Pending stylist → `/studio/bookings` → `/studio/pending` | redirect | ❌ **FAIL** — no redirect (same as 7d). **D5**. |
| 8h `GET /stylists/:id` for pending/suspended | 404 | ✅ **404** `NOT_FOUND` |

**Scenario 8 verdict:** **backend authorization is excellent** — role gates (401/403), per-resource ownership
checks (booking 403, foreign service 404), and non-APPROVED stylist hiding (404) all correct, with clean error
envelopes. The only miss is the **frontend** route guard for non-APPROVED stylists (**D5**, 8g).

### Scenario 9 — Navbar & Layout Visual Verification

| Step | Result | Evidence |
|------|--------|----------|
| 9a Desktop scroll: sidebar + topbar pinned, breadcrumb correct | ✅ PASS | On the scrollable `/admin/users` (doc 1324 > viewport 656): after scrolling to bottom, **topbar rect `{x:256,y:0,w:1024,h:56}` and sidebar rect `{x:0,y:0,w:256,h:656}` were byte-identical** (`moved:false`). Breadcrumbs update per section (Dashboard / Stylists / Users / Bookings / Services / Overview). Topbar `position:sticky;top:0;z-20`; sidebar `position:fixed;inset-y-0;z-30`. Screenshots: `audit-screenshots/admin-users-top.png`, `admin-users-bottom.png`, `admin-dashboard-desktop.png`, `studio-desktop.png`. (Dashboard/studio content fits the viewport, so they don't scroll; pinning proven on the tall page + by CSS.) |
| 9b Mobile (375px): fixed header, content not hidden | ✅ PASS | Mobile header `position:fixed; top:0` (stays at top on scroll); `main` has `padding-top:80px` so content clears the header. Screenshot `studio-mobile.png`. |
| 9c Mobile menu closes on navigate; section updates | ✅ PASS (minor note) | Hamburger opens a focus-managed modal dialog ("Close navigation menu" auto-focused); selecting "Services" → menu closed (`aria-expanded=false`), `h1`→"Services". **Minor:** mobile topbar shows a static "Studio" label (section name only in the h1; desktop breadcrumb does update) — **D14 (LOW)**. |
| 9d Desktop dropdown: Escape closes + focus returns; Tab focus ring | ✅ PASS | Opening moves focus into `role="menu"` (first item focused); ArrowDown moves Profile→Sign out, each menuitem `outline: solid 2px` (visible ring); **Escape closes and returns focus to the trigger** (`aria-expanded=false`). |

**Scenario 9 verdict:** the recent navbar/layout work holds up — **fixed sidebar + sticky topbar are provably
pinned** (rect-invariant under scroll), the breadcrumb tracks the section on desktop, the mobile header is fixed
with correct content offset, the mobile menu traps focus + auto-closes, and the account dropdown has full keyboard
support (focus-in, arrow nav, visible focus ring, Escape-to-close with focus restore). Only nit: **D14** static
mobile topbar label. The earlier reported bugs (marketing navbar bleeding into dashboards, mobile header scrolling
away, studio→/auth/login 404) are all resolved in the current build.

---

## 5. NAVBAR FIX EVIDENCE

Before (per prior commits, now fixed): marketing Navbar/Footer leaked onto admin/studio; mobile header scrolled
away; studio redirected to a 404 `/auth/login`. **After (this build):** verified above (Scenario 9).

Screenshot artifacts (in `docs/audit-screenshots/`):
- `admin-users-top.png` / `admin-users-bottom.png` — sidebar + topbar identical position before/after full scroll (pinned).
- `admin-dashboard-desktop.png`, `studio-desktop.png` — desktop dashboard chrome.
- `studio-mobile.png` — 375px fixed header + content offset.

Proof of pinning (programmatic, `/admin/users`, scrolled to bottom): topbar `getBoundingClientRect` `{x:256,y:0,w:1024,h:56}` and sidebar `{x:0,y:0,w:256,h:656}` **unchanged** vs. top (`moved:false`).

---

## 6. LIGHTHOUSE SCORES (desktop, navigation unless noted)

| Page | PWA | Performance (LCP / CLS) | Accessibility | Best Practices | SEO |
|------|-----|--------------------------|---------------|----------------|-----|
| `/` | ✅ installable | **LCP 94 ms / CLS 0.00** (TBT ~0) | **100** | **100** | 100 |
| `/Search` | — | **LCP 148 ms / CLS 0.00** | **96** | **100** | 100 |
| `/admin/dashboard` | — | n/m | **96** | **96** (console errors) | 100 |
| `/studio` | — | n/m | **96** (snapshot¹) | **100** (snapshot) | 100 |

¹ Navigation-mode Lighthouse on authenticated pages reloads with a cleared session → the studio layout redirects to
`/Login`, so the nav-mode "91" measured the **login page**, not studio. Re-measured `/studio` in **snapshot mode**
(authenticated, no reload) → **a11y 96**. The login page itself scores **a11y 91** (color-contrast + heading-order +
small "Show password" target — recorded as **D15**).

**Targets:** PWA installable+offline ✅ (valid `manifest.webmanifest`: standalone, 192/512 **maskable** icons,
shortcuts, screenshot; SW registered; `/offline` 200). Performance LCP<2.5s ✅ / CLS<0.1 ✅ / TBT<200ms ✅ (measured
unthrottled on localhost prod build — real 4G will be higher but the bundle is small and render-blocking is minimal).
Accessibility ≥95 ✅ on all four target pages. Best Practices ≥90 ✅ on all.

**Recurring Lighthouse findings (below 100):**
- **D15 — color-contrast (a11y, weight 7):** muted `text-gray-400` text (helper/labels, the Customer/Stylist toggle
  inactive state) fails WCAG 2.1 AA 4.5:1 on white. Single recurring issue dropping a11y 100→96 across pages, and
  the main contributor (with heading-order + target-size) to the login page's 91.
- **D16 — errors-in-console (best-practices, weight 1):** `/admin/dashboard` logs a browser console error — the
  first authenticated API call 401s before the refresh interceptor replays it; the failed XHR is logged as an error.
  Cosmetic but dings Best Practices and adds console noise.

> The audit's special-attention items (icon-button aria-labels in the topbar dropdown, breadcrumb contrast, dropdown
> focus management) all **PASS** — the DashboardTopbar dropdown had no a11y failures; the only a11y miss is the
> generic `text-gray-400` contrast.

---

## 7. WHAT REMAINS

Severity key: **BLOCKER** (must fix before real users) · **HIGH** (fix soon) · **NICE-TO-HAVE**.

### BLOCKER
- **Payments are unverified end-to-end (D-pay).** No Paystack key in this environment, so booking → payment →
  webhook confirmation → idempotency was never exercised live. A booking-marketplace cannot ship without a proven
  payment + webhook-idempotency path. *Est: 0.5–1 day to wire a Paystack test key, drive a real checkout, and assert
  webhook idempotency (double-fire must not double-confirm).*

### HIGH
- **D1 — Service worker caches authenticated per-user PII GETs** (`/bookings/me`, `/bookings/:id`). Cross-session PII
  leak on shared devices + stale data after mutations + unreliable client auth state. *Fixed in this pass (see below); needs the fix verified in CI.* *Est: done (0.5 day incl. verification).*
- **D2 — No customer profile management.** Registration collects only name/email/password; no `PATCH` profile
  endpoint; `/dashboard` has no profile section; `GET /me` omits phone/address. Customers cannot supply the
  phone/home-service address the booking flow needs. *Est: 0.5–1 day (shared schema → repo/service/controller →
  `PATCH /auth/me` → dashboard profile section; extend `AuthUser`).*
- **D5 — No stylist-status gating in the app.** `AuthUser` never carries `stylistStatus`, so the studio "pending"
  banner is dead code, there is no `/studio/pending` route, and PENDING/SUSPENDED stylists keep full studio access
  with no indication (the backend already blocks them from being booked/listed). *Est: 0.5–1 day (embed
  `stylistStatus` on `AuthUser`; `/studio/pending` page; status gate in the stylist layout).*
- **D12 — No gift-voucher redemption UI.** Redemption exists only as an API; a recipient cannot redeem in-app. *Est:
  0.5 day (`/gift-service/redeem` page: code → lookup → stylist/slot → redeem).*
- **D10 — Stylist search ignores service names + plurals.** "braids"/"Box Braids"/"knotless" return nothing; poor
  discovery for a service marketplace. *Est: 0.5 day (search across joined service names; basic normalisation).*

### NICE-TO-HAVE
- **D6 — Install-prompt banner overlaps bottom CTAs** (blocked the onboarding Next button until dismissed). *Est: 1–2h.*
- **D7 — Stylist registration discards bio/experience/portfolio** (collected but not persisted; no studio profile-edit
  UI to set them later). *Est: 0.5 day (wire to existing `stylist-me` update + a studio Profile tab).*
- **D9 — Availability unmanageable without a booking** (`stylistId` inferred from `bookings[0]`). *Est: 2–3h (use
  `GET /stylists/me`).*
- **D11 — Booking card shows constituent services, not the package name** (stylist, customer, admin views). *Est: 1–2h.*
- **D13 — Gift voucher `code` is a raw CUID** (not human-friendly to share). *Est: 1–2h.*
- **D14 — Mobile studio/admin topbar shows a static "Studio"/section label** instead of the current section. *Est: 1h.*
- **D15 — `text-gray-400` muted text fails WCAG AA contrast** (a11y 100→96; login page → 91 with heading-order +
  small "Show password" target). *Est: 2–4h to darken muted text + fix the two login-page issues → a11y ~100.*
- **D16 — Console error on first authenticated load** (401-before-refresh logged as an error; dings Best Practices).
  *Est: 1–2h (suppress/expected-handle the pre-refresh 401, or prime the token before the first data call).*
- **D3/D4 — Register page dead `phone` state field; success card "Explore Services" → `/`, no dashboard redirect.** *Est: 1h.*
- **Reviews & Web Push flows not exercised** in this audit (seeded reviews render; push needs VAPID + a device). *Est: 0.5 day to verify.*

---

## 8. TOP 5 RISKS IF SHIPPED TO REAL NIGERIAN USERS TODAY

1. **Payment integrity is unproven (BLOCKER).** The entire revenue path — Paystack checkout, webhook confirmation,
   and idempotency — has not been verified end-to-end. If a webhook double-fires or a client-trusted state slips in,
   users could be double-charged or get bookings confirmed without payment. This is the #1 thing to prove before launch.
2. **PII leakage via the service worker on shared devices (D1).** Phones are frequently shared in this market. The SW
   cached `/bookings/me` and `/bookings/:id` (customer name, phone, **home address**) keyed by URL with no
   clear-on-logout — so the next person on the same device/browser could be served the previous user's bookings and
   address from CacheStorage. NDPR exposure. *(Addressed in this pass; must stay fixed.)*
3. **Customers can't be reached for home-service appointments (D2).** New customers have no way to set a phone or
   address, yet stylists rely on exactly that to deliver. Many real bookings would arrive with empty contact details.
4. **Suspended/unapproved stylists keep their studio (D5).** A stylist suspended for cause (fraud, complaints) still
   sees the full studio with no indication; trust/moderation gap. (Mitigated server-side: they can't be booked/listed.)
5. **Discovery is brittle (D10) + flaky availability (D9).** Customers searching the obvious term ("braids") or a
   service name find nothing, and newly-approved stylists can be stuck "unavailable"/unbookable until they have a
   booking — both directly suppress the marketplace's core transaction on low-end devices/flaky networks.

