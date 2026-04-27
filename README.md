# Glamly — Beauty Booking Platform

A production-grade stylist discovery and booking platform built with Next.js App Router, React 19, and Tailwind CSS v4. Users can browse stylists, filter by service, view full stylist profiles with portfolio and reviews, save favourites, and complete a multi-step appointment booking — all with a polished, accessible, modern UI.

---

## Live Demo

> Run locally — see [Getting Started](#getting-started) below.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | RSC, file-based routing, built-in image optimisation |
| Language | JavaScript (ES2022) | No transpilation overhead; all modern syntax available |
| Styling | Tailwind CSS v4 | Utility-first, zero runtime, CSS custom property tokens |
| Data fetching | SWR | Stale-while-revalidate, `keepPreviousData` for no-flash filter changes |
| Animation | Framer Motion | Declarative enter/exit without hand-rolling keyframes |
| Icons | react-icons | Tree-shakeable, consistent icon families |
| Mock API | Next.js Route Handlers | Simulates real backend latency, pagination, and filtering |
| Images | `next/image` | Automatic WebP/AVIF, lazy loading, CLS prevention |
| Testing | Vitest + Testing Library | Fast, jsdom-based unit tests for hooks and pure functions |

---

## Features

### User-facing
- **Stylist discovery** — browse 25 stylists with location, services, rating, and live availability badge
- **Advanced search** — debounced text search, service chips, collapsible rating/price/sort filter panel, "show busy" toggle
- **Full stylist profile pages** — hero banner with cover photo, tabbed About / Services / Portfolio / Reviews, stat cards, sticky booking footer, share button, and favorites toggle
- **Portfolio tab** — 6-photo grid gallery showcasing each stylist's work with hover zoom
- **Services tab** — itemised service list with per-service pricing and a custom-request callout
- **Save favourites** — heart toggle on every card, persisted to `localStorage`, count shown in the search header
- **Multi-step booking wizard** — 5-step flow: Service → Stylist → Date & Time → Details → Confirm, with per-step validation
- **Booking with packages and add-ons** — `/booking/[id]` with package selection, optional extras, and running total
- **Gift service form** — generates a styled digital gift voucher with a unique code on submit
- **Stylist onboarding** — 4-step registration wizard with validation and review screen before submission
- **Authentication** — login and register with Customer / Stylist role toggle, global auth state, password strength meter, social sign-in buttons, persistent session via `localStorage`

### Technical
- **SWR data fetching** — `useStylists`, `useStylist`, `useServices` hooks with `keepPreviousData` eliminating filter-change flicker
- **Mock API routes** — `GET /api/stylists`, `GET /api/stylists/[id]`, `GET /api/services` with simulated delays, full filtering, sorting, and pagination
- **Global auth context** — `useReducer`-based `AuthContext` with `login`, `register`, `logout`, loading/error state, and localStorage persistence
- **Centralised validation** — pure `lib/validation.js` functions (`validateLogin`, `validateRegister`, `validateBookingStep`, `validateGiftService`, `passwordStrength`) — no React dependency, fully testable in isolation
- **Skeleton loaders** — shimmer placeholders on every data-dependent surface; zero blank screens or layout shift
- **Suspense boundaries** — `useSearchParams` wrapped in `<Suspense>` on both `/Search` and `/stylist` routes, eliminating the Next.js prerender bailout error
- **Dynamic imports** — all non-critical landing sections and heavy page components lazy-loaded with `next/dynamic`
- **Server / Client Component split** — layout, footer, and static sections remain Server Components; interactivity isolated to the smallest possible Client Components
- **Accessibility** — `role="search"`, `aria-live`, `aria-busy`, `aria-pressed`, `aria-current`, `role="tabpanel"`, `aria-labelledby`, `focus-visible` outlines, semantic `dl`/`dt`/`dd` for definition lists, `role="progressbar"` on rating bars
- **SEO metadata** — `title` template, `description`, `openGraph`, and `keywords` wired into the root layout
- **42 passing tests** — `useDebounce`, `useFavorites`, and all 5 validation functions fully covered

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── stylists/
│   │   │   ├── route.js              # GET /api/stylists  (filter, sort, paginate)
│   │   │   └── [id]/route.js         # GET /api/stylists/:id  (enriched detail)
│   │   └── services/route.js         # GET /api/services
│   ├── stylist/
│   │   ├── page.js                   # Stylist listing (Suspense-wrapped SearchPage)
│   │   └── [id]/page.js              # Full stylist profile — About, Services, Portfolio, Reviews tabs
│   ├── Search/
│   │   └── page.js                   # /Search route (Suspense-wrapped SearchPage)
│   ├── booking/[id]/page.js          # Full booking (packages + add-ons)
│   ├── book-appointment/             # 5-step booking wizard
│   ├── services/                     # Service catalogue with category filters
│   ├── gift-service/                 # Gift voucher form
│   ├── Login/page.js                 # Auth: login (useAuth + validateLogin)
│   ├── register/page.js              # Auth: customer + stylist registration
│   ├── stylist-register/             # Auth: stylist onboarding (4 steps)
│   ├── packages/                     # Packages catalogue
│   ├── layout.js                     # Root layout — AuthProvider, Navbar, Footer
│   └── globals.css                   # Tailwind import, CSS tokens, animations
├── components/
│   ├── Layout/
│   │   ├── Navbar.js                 # Auth-aware: avatar + dropdown or Sign in CTA
│   │   ├── Footer.js                 # Dark footer (Server Component)
│   │   └── NewsletterForm.js         # Isolated Client Component for newsletter
│   ├── Landing/                      # Home page sections (all dynamically imported)
│   ├── Search/
│   │   ├── Searchpage.js             # SWR-powered listing — filter/sort/pagination
│   │   ├── SearchFilters.js          # Collapsible filter panel with pill controls
│   │   └── StylistCard.js            # Card with availability badge, stars, favourites, Profile link
│   └── ui/
│       ├── Button.jsx
│       ├── Card.jsx
│       ├── Input.jsx
│       └── Skeleton.jsx              # StylistCardSkeleton, CardSkeleton, etc.
├── context/
│   └── AuthContext.js                # useReducer auth state, localStorage persistence
├── hooks/
│   ├── useDebounce.js                # Debounced value with configurable delay
│   ├── useFavorites.js               # localStorage-backed favourites Set
│   ├── useStylists.js                # SWR hook — list + single stylist
│   └── useServices.js                # SWR hook — service catalogue
├── lib/
│   ├── fetcher.js                    # SWR fetcher with typed error
│   └── validation.js                 # Pure validation functions (no React)
├── __tests__/
│   ├── setup.js                      # jest-dom + IS_REACT_ACT_ENVIRONMENT
│   ├── validation.test.js            # 29 tests — all validators + regex
│   ├── useDebounce.test.js           # 5 tests — fake timers
│   └── useFavorites.test.js          # 8 tests — localStorage mock
└── data/
    ├── services.json
    └── stylist/stylist.json
```

---

## Pages & Routes

| Route | Description |
|---|---|
| `/` | Landing page with hero, featured stylists, services, packages |
| `/stylist` | Browse all stylists — search, filter, sort, paginate |
| `/stylist/[id]` | Full stylist profile — tabs: About, Services, Portfolio, Reviews |
| `/Search` | Alias search route (same SearchPage, Suspense-wrapped) |
| `/booking/[id]` | Book a stylist — packages, add-ons, time slots |
| `/book-appointment` | 5-step booking wizard |
| `/services` | Service catalogue |
| `/gift-service` | Send a gift voucher |
| `/packages` | Packages overview |
| `/Login` | Login for users and stylists |
| `/register` | Register a new account |
| `/stylist-register` | Stylist onboarding (4-step wizard) |

---

## Getting Started

### Prerequisites

- **Node.js 18+**
- **npm**

### Installation

```bash
git clone https://github.com/your-username/glamly.git
cd glamly
npm install --include=dev
```

> **Note:** Tailwind CSS v4 (`@tailwindcss/postcss`) is a devDependency. Always use `npm install --include=dev` or set `NODE_ENV=development` so the PostCSS plugin is available during the build.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production build

```bash
npm run build
npm start
```

### Tests

```bash
npm test          # run once
npm run test:watch  # watch mode
```

---

## Key Design Decisions

### SWR over direct JSON imports
The search and stylist detail pages use SWR hooks (`useStylists`, `useStylist`) backed by mock API route handlers rather than direct JSON imports. This means every component already speaks the real data-fetching contract — swapping in a real database only requires changing the route handler body, not any component. `keepPreviousData: true` eliminates the flash-to-empty-state that occurs when filters change.

### Suspense boundaries for `useSearchParams`
`Searchpage.js` uses `useSearchParams()` to read initial filter values from the URL. Next.js App Router requires any component that calls `useSearchParams` to be wrapped in a `<Suspense>` boundary, or the build fails with a prerender bailout error. Both `/Search/page.js` and `/stylist/page.js` wrap `<SearchPage>` in `<Suspense>` with a skeleton fallback matching the grid layout, so there is never a blank screen.

### Server / Client Component boundary
Root layout, Footer, and all static landing sections are Server Components — they ship zero JavaScript to the browser. Client Components are introduced only at interaction points: Navbar, StylistCard, all forms, and the search listing. The newsletter `<form>` is extracted into `NewsletterForm.js` specifically to keep Footer as a Server Component.

### Stylist profile tabs
The profile page (`/stylist/[id]`) uses four tabs — About, Services, Portfolio, Reviews — to organise a large amount of per-stylist information without overwhelming the layout. Tab state is local to the page (no URL param needed) since the content is supplemental; deep-linking to a specific tab is deferred to when a real backend exists.

### Auth via Context + localStorage
`AuthContext` uses `useReducer` for predictable state transitions and persists the session to `localStorage`. This is the right architecture for a frontend-only project — it mirrors what a real app would do with an HttpOnly cookie, making the transition to a real backend a one-line change in the `simulateLogin` function.

### Centralised validation
All form validation lives in `lib/validation.js` — pure functions with zero React dependency. This means the same rules run in tests, in forms, and (when a backend exists) can be imported server-side too.

### Skeleton-first loading
Every surface that waits on data shows a shimmer skeleton rather than a spinner or blank screen. This prevents layout shift (CLS) and gives a perceived-performance advantage that matches what users expect from apps like Airbnb or Uber.

---

## Roadmap — what a real backend would add

- [ ] Authentication via Next.js Middleware (JWT / HttpOnly session cookies)
- [ ] Database layer (Postgres via Supabase or Neon)
- [ ] Stylist profile image upload (Vercel Blob or Cloudinary)
- [ ] Real-time availability (WebSockets or polling)
- [ ] Payment processing (Paystack for Nigeria, or Stripe)
- [ ] Email confirmations and reminders (Resend)
- [ ] Stylist dashboard — manage bookings, view earnings
- [ ] Admin panel — approve stylists, moderate reviews
- [ ] End-to-end tests (Playwright) once API is real
- [ ] Portfolio image upload per stylist
- [ ] Deep-link to profile tabs via URL hash

---

## Author

**Adeniran Israel**  
Frontend Engineer  
[GitHub](https://github.com/your-username) · [LinkedIn](https://linkedin.com/in/your-profile)

---

## License

MIT
