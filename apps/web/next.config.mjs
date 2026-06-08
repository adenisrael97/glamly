import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import withSerwistInit from "@serwist/next";
import { withSentryConfig } from "@sentry/nextjs";

// A revision versions any precache entry we add by hand (the `/offline` page).
// The git commit SHA changes every deploy, so the offline page is re-cached when
// it changes; falls back to a random id when git isn't available (e.g. Docker).
const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  randomUUID();

// Serwist (Workbox) compiles src/app/sw.ts to public/sw.js and injects a precache
// manifest with per-file revision hashes, so every deploy busts its own caches.
// Disabled in development so the SW never caches dev chunks (HMR is the source of
// truth there); auto-registers on every page in production.
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  register: true,
  reloadOnOnline: true,
  additionalPrecacheEntries: [{ url: "/offline", revision }],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile workspace packages that ship TypeScript source (JIT internal packages).
  transpilePackages: ["@glamly/shared"],

  // Linting is a dedicated pipeline task (`turbo lint`), not coupled to the
  // production build — see CLAUDE.md §8 where tsc / lint / build are distinct
  // gates. Type errors still fail the build (typescript.ignoreBuildErrors is off).
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    // Quality values used across the app (next/image). Declaring them is required
    // from Next.js 16 and silences the dev deprecation warning.
    qualities: [75, 80],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Enable compression
  compress: true,

  // Service worker headers so browsers accept the scope claim.
  // sw.js lives in /public and is served from the root — the header just makes
  // the scope explicit and avoids a Chrome warning.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
    ];
  },
};

// Apply Sentry's build-time instrumentation ONLY when a DSN is configured. With no
// DSN (local dev, CI, this repo's default) the plain config is used, so Sentry
// never enters the client bundle OR the edge middleware — the build is identical to
// the pre-Sentry baseline (§12 JS budget). Source-map upload is further gated on a
// SENTRY_AUTH_TOKEN so credential-less prod builds still succeed (they skip upload).
const withSentry = (config) =>
  process.env.NEXT_PUBLIC_SENTRY_DSN
    ? withSentryConfig(config, {
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        silent: !process.env.CI,
        disableLogger: true,
        bundleSizeOptimizations: {
          excludeDebugStatements: true,
        },
        sourcemaps: {
          disable: !process.env.SENTRY_AUTH_TOKEN,
        },
        widenClientFileUpload: false,
      })
    : config;

// Serwist wraps the (optionally Sentry-instrumented) config so both build-time
// transforms apply.
export default withSerwist(withSentry(nextConfig));
