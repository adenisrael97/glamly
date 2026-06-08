import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import {
  BackgroundSyncPlugin,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

// Glamly service worker (CLAUDE.md §5), built with Serwist (Workbox).
//
// Why Serwist instead of a hand-rolled SW: `self.__SW_MANIFEST` is a precache
// manifest generated at build time with a per-file *revision hash*, so every
// deploy busts its own caches automatically (no manually-bumped "v1/v2" names),
// and `cleanupOutdatedCaches` purges the previous build's entries. With
// `skipWaiting` + `clientsClaim` the new worker activates immediately; the client
// then reloads once (see usePWA) so users are never served a stale shell.
//
// In development this file is never built/registered (`disable` in next.config),
// so dev relies purely on HMR and can't serve stale chunks.

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Replaced at build time by the Serwist webpack plugin (the `injectionPoint`).
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// ─── API caching rules (ported from the previous hand-rolled SW) ──────────────
//
// Only PUBLIC, non-user-specific catalogue GETs may be cached. Authenticated /
// per-user and auth responses are network-only: they carry PII (customer name /
// phone / address) and would leak across sessions on a shared device or serve
// stale data after a mutation (CLAUDE.md §5 strategy + §10 PII).
//
// These rules are placed BEFORE `defaultCache`, which otherwise has a catch-all
// that would cache every same-origin `/api/` GET in an "apis" cache — exactly the
// PII leak we must prevent. First match wins, so shadowing it here is the guard.

const isApi = (pathname: string): boolean => pathname.startsWith("/api/v1/");

function isPublicCatalogGet(pathname: string, request: Request): boolean {
  if (request.headers.has("authorization")) return false; // authenticated → not public
  if (pathname.startsWith("/api/v1/stylists/me")) return false; // storefront mgmt
  return (
    pathname.startsWith("/api/v1/stylists") || // list, public profile, availability, reviews
    pathname.startsWith("/api/v1/services") ||
    pathname.startsWith("/api/v1/packages")
  );
}

// Offline mutation queue: when a mutation fails offline it is stored and replayed
// once connectivity returns, after which open clients are told so the UI can show
// a "synced" toast (preserves the SYNC_COMPLETE contract usePWA listens for).
const mutationSync = new BackgroundSyncPlugin("glamly-mutation-sync", {
  maxRetentionTime: 24 * 60, // minutes — drop requests older than 24h
  onSync: async ({ queue }) => {
    await queue.replayRequests();
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    for (const client of clients) client.postMessage({ type: "SYNC_COMPLETE" });
  },
});

const mutationMethods = ["POST", "PUT", "PATCH", "DELETE"] as const;

const apiCaching: RuntimeCaching[] = [
  // Public catalogue GETs → stale-while-revalidate (fast + offline browsing).
  {
    matcher: ({ url, request, sameOrigin }) =>
      sameOrigin && isApi(url.pathname) && isPublicCatalogGet(url.pathname, request),
    method: "GET",
    handler: new StaleWhileRevalidate({ cacheName: "glamly-api-catalog" }),
  },
  // Non-auth API mutations → network-only, queued for Background Sync when offline.
  // (Auth mutations are intentionally left to pass through to the network — never
  // queued/replayed — matching the previous SW.)
  ...mutationMethods.map(
    (method): RuntimeCaching => ({
      matcher: ({ url, sameOrigin }) =>
        sameOrigin && isApi(url.pathname) && !url.pathname.startsWith("/api/v1/auth"),
      method,
      handler: new NetworkOnly({ plugins: [mutationSync] }),
    }),
  ),
  // Every other same-origin API GET (authenticated/per-user, auth) → network-only,
  // never cached. This shadows defaultCache's "apis" rule (the PII guard above).
  {
    matcher: ({ url, sameOrigin }) => sameOrigin && isApi(url.pathname),
    method: "GET",
    handler: new NetworkOnly(),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: { cleanupOutdatedCaches: true },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  disableDevLogs: true,
  // Our API rules first, then Serwist's Next.js defaults (immutable static assets,
  // images, fonts, network-first pages/RSC).
  runtimeCaching: [...apiCaching, ...defaultCache],
  // Serve the offline page when a navigation can't be fulfilled from the network
  // or the cache. `/offline` is precached via `additionalPrecacheEntries`.
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();

// One-time migration cleanup: drop caches created by the PREVIOUS hand-rolled
// service worker (now replaced by Serwist). They're orphaned — no fetch handler
// reads them — but deleting them keeps users who had the old SW from carrying
// dead storage. Targeted by name so Serwist's own runtime caches are untouched.
const LEGACY_CACHES = ["glamly-shell-v1", "glamly-api-v1", "glamly-api-v2"];
self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all(LEGACY_CACHES.map((name) => caches.delete(name))));
});

// ─── Web Push (ported verbatim from the previous SW) ──────────────────────────

self.addEventListener("push", (event) => {
  let payload: { title?: string; body?: string; tag?: string; url?: string } = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Glamly", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Glamly";
  const options: NotificationOptions = {
    body: payload.body || "",
    tag: payload.tag,
    data: { url: payload.url || "/" },
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data?.url as string | undefined) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(targetUrl) && "focus" in client) return client.focus();
        }
        return self.clients.openWindow(targetUrl);
      }),
  );
});
