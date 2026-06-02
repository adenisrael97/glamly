# Glamly — Local Setup & Deployment Guide

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 20 | [nodejs.org](https://nodejs.org) |
| pnpm | 10.11.0 | `corepack enable && corepack prepare pnpm@10.11.0 --activate` |
| Docker + Compose | any recent | [docker.com](https://docker.com) |
| Git | any | — |

---

## 1. Local development

### 1.1 Clone and install

```bash
git clone <repo-url> glamly
cd glamly
pnpm install
```

### 1.2 Environment variables

Copy the example file and fill in secrets:

```bash
cp .env.example apps/api/.env
```

Edit `apps/api/.env`. Required values:

| Key | Notes |
|-----|-------|
| `DATABASE_URL` | Points to local Postgres (port 5433 by default via Docker Compose) |
| `REDIS_URL` | Points to local Redis |
| `JWT_ACCESS_SECRET` | Min 32 chars — generate with `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Min 32 chars — generate with `openssl rand -hex 32` |
| `PAYSTACK_SECRET_KEY` | `sk_test_…` from Paystack dashboard |
| `CORS_ORIGINS` | `http://localhost:3000` for local dev |

For the web app, create `apps/web/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

Optional values (server degrades gracefully when absent):
- `RESEND_API_KEY` — emails logged to console instead
- `VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY` — push disabled
- `CLOUDINARY_*` — image upload skipped
- `SENTRY_DSN` — errors only logged

Generate VAPID keys (one-time):

```bash
npx web-push generate-vapid-keys
```

### 1.3 Start infrastructure

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

This starts **Postgres on port 5433** and **Redis on port 6379** (ports chosen to avoid conflicts with other local services).

### 1.4 Run database migrations and seed

```bash
pnpm --filter @glamly/api db:generate   # generate Prisma client
pnpm --filter @glamly/api db:migrate    # apply migrations
pnpm --filter @glamly/api db:seed       # seed demo data (optional)
```

### 1.5 Start dev servers

```bash
pnpm dev   # runs both web (port 3000) and api (port 4000) via Turbo
```

Or start them individually:

```bash
pnpm --filter @glamly/web dev    # Next.js → http://localhost:3000
pnpm --filter @glamly/api dev    # Express → http://localhost:4000
```

---

## 2. Running tests

```bash
pnpm typecheck          # TypeScript — zero errors required
pnpm lint               # ESLint — zero warnings required
pnpm test               # Vitest unit + integration tests
pnpm --filter @glamly/web test:e2e    # Playwright E2E (requires running servers)
```

API integration tests hit a **real Postgres + Redis**. The test setup (`apps/api/src/test/setup.ts`) loads `apps/api/.env` automatically so the same database URL is reused. Each test run is isolated via unique email namespaces.

---

## 3. CI/CD pipeline

The pipeline (`.github/workflows/ci.yml`) runs on every push and pull request:

1. **Typecheck** — `pnpm typecheck` via Turbo
2. **Lint** — `pnpm lint` via Turbo
3. **Test** — `pnpm test` via Turbo (includes Postgres + Redis services in CI)
4. **Build** — `pnpm build` via Turbo (Next.js + API tsc)

PRs must be green before merge. Branch protection should be enabled on `main` requiring this workflow to pass.

### Enable branch protection

In GitHub → Settings → Branches → Add branch protection rule for `main`:
- ✅ Require status checks: **typecheck · lint · test · build**
- ✅ Require branches to be up to date before merging
- ✅ Restrict force-push

---

## 4. Deploy web to Vercel

### 4.1 Link the project

```bash
npx vercel link
```

When prompted:
- **Root Directory**: `apps/web`
- Framework preset auto-detects as **Next.js**

### 4.2 Environment variables

In the Vercel dashboard (or via `vercel env add`):

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://api.glamly.ng/api/v1` (your Render/Railway API URL) |

### 4.3 Deploy

Preview:
```bash
npx vercel
```

Production:
```bash
npx vercel --prod
```

Or push to `main` if Vercel → GitHub integration is configured (automatic deploys).

The `apps/web/vercel.json` configures the build command:
```
cd ../.. && pnpm turbo build --filter=@glamly/web...
```

This ensures Turbo builds `@glamly/shared` before the Next.js build.

---

## 5. Deploy API to Render

### 5.1 First deploy

```bash
npm install -g @render/cli   # or use the Render dashboard
render up                     # reads render.yaml from repo root
```

This provisions:
- **glamly-api** — Docker build from `apps/api/Dockerfile`
- **glamly-postgres** — Managed PostgreSQL 16
- **glamly-redis** — Managed Redis

### 5.2 Set secrets (sync: false)

After first deploy, set these in the Render dashboard under the `glamly-api` service → Environment:

| Key | Where to get it |
|-----|----------------|
| `PAYSTACK_SECRET_KEY` | Paystack dashboard → API Keys |
| `VAPID_PUBLIC_KEY` | `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | same |
| `RESEND_API_KEY` | resend.com → API Keys |
| `CLOUDINARY_CLOUD_NAME` | cloudinary.com dashboard |
| `CLOUDINARY_API_KEY` | cloudinary.com dashboard |
| `CLOUDINARY_API_SECRET` | cloudinary.com dashboard |
| `SENTRY_DSN` | sentry.io → Project → Client Keys |

### 5.3 Update CORS

After the Vercel URL is known, update `CORS_ORIGINS` in the Render dashboard:

```
CORS_ORIGINS=https://glamly.vercel.app,https://glamly.ng
```

### 5.4 Health checks

- `GET /health` — liveness (returns 200 when the process is running)
- `GET /ready` — readiness (returns 200 when DB + Redis are reachable)

Render uses `/health` by default (configured in `render.yaml`).

---

## 6. Alternative: Deploy API to Railway

Railway is an alternative to Render with excellent pnpm monorepo support.

1. Install Railway CLI: `npm install -g @railway/cli`
2. `railway login && railway init`
3. In Railway dashboard → Service → Settings:
   - **Source (Root Directory)**: leave as repo root
   - **Build Command**: `pnpm install --frozen-lockfile && pnpm --filter @glamly/shared build && pnpm --filter @glamly/api exec prisma generate && pnpm --filter @glamly/api build`
   - **Start Command**: `pnpm --filter @glamly/api start`
4. Add a Postgres plugin and a Redis plugin from Railway's marketplace
5. Set environment variables (same as Render above)

---

## 7. Production CORS checklist

Before going live, verify `CORS_ORIGINS` in the API environment includes **all** origins the frontend is served from:

```
CORS_ORIGINS=https://glamly.vercel.app,https://glamly.ng,https://www.glamly.ng
```

The API never uses wildcard `*` — origins are an explicit allowlist (§6 in CLAUDE.md).

---

## 8. Secrets rotation

| Secret | Rotation strategy |
|--------|------------------|
| `JWT_ACCESS_SECRET` | Change forces all access tokens to expire within 15 min |
| `JWT_REFRESH_SECRET` | Change forces all users to re-login |
| `PAYSTACK_*` | Rotate in Paystack dashboard first, then update env |
| `VAPID_*` | Changing public key requires all push subscriptions to re-subscribe |

---

## 9. Useful commands

```bash
# Generate a fresh VAPID key pair
npx web-push generate-vapid-keys

# Generate a random secret (32 bytes)
openssl rand -hex 32

# Run a specific Prisma migration in production (via CLI)
pnpm --filter @glamly/api db:migrate:deploy

# Inspect the database locally
pnpm --filter @glamly/api db:studio

# Build just the API (outputs to apps/api/dist/)
pnpm --filter @glamly/api build

# Build shared to CJS (needed before Docker builds)
pnpm --filter @glamly/shared build
```
