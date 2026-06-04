# syntax=docker/dockerfile:1
# Multi-stage build for @glamly/api in the pnpm monorepo.
#
# Stage order:
#   base      — common Node + pnpm setup
#   installer — install all workspace deps (cached layer)
#   builder   — compile shared (CJS) → generate Prisma client → compile API (tsc)
#   pruner    — pnpm deploy: copy production-only deps + inline workspace packages
#   runner    — minimal runtime image

# ── base ──────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

# ── installer ─────────────────────────────────────────────────────────────────
FROM base AS installer
WORKDIR /repo

# Copy workspace manifests first (Docker layer cache: only invalidated when
# lockfile or package.json files change, not when source changes).
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/config/package.json                ./packages/config/package.json
COPY packages/shared/package.json                ./packages/shared/package.json
COPY packages/shared/tsconfig.json               ./packages/shared/tsconfig.json
COPY packages/shared/tsconfig.build.json         ./packages/shared/tsconfig.build.json
COPY apps/api/package.json                       ./apps/api/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ── builder ───────────────────────────────────────────────────────────────────
FROM installer AS builder

# Copy full source for all packages the api depends on.
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# 1. Build @glamly/shared → packages/shared/dist/index.js (CJS)
#    Required at runtime: the compiled API's require('@glamly/shared') resolves
#    to dist/index.js via the "require" export condition in package.json.
RUN pnpm --filter @glamly/shared build

# 2. Generate Prisma client (reads schema, emits to node_modules/.prisma/client)
RUN pnpm --filter @glamly/api exec prisma generate

# 3. Compile TypeScript → apps/api/dist/
RUN pnpm --filter @glamly/api build

# 4. Create a standalone deploy directory with production deps only.
#    pnpm deploy inlines workspace packages (including shared/dist/) so the
#    runner stage needs no pnpm or workspace awareness.
RUN pnpm deploy --filter @glamly/api --prod --legacy /deploy

# Copy the compiled dist and Prisma artifacts into the deploy root.
RUN cp -r apps/api/dist   /deploy/dist
RUN cp -r apps/api/prisma /deploy/prisma

# ── runner ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /deploy ./

EXPOSE 4000

# Run pending migrations, then start the API.
# The prisma CLI is a production dependency, so node_modules/.bin/prisma exists.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/index.js"]
