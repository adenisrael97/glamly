/* Glamly service worker (CLAUDE.md §5).
 *
 * Strategies:
 *   App-shell routes & static assets → cache-first (fast, resilient to offline)
 *   API GET requests                  → stale-while-revalidate (fresh data when online)
 *   API mutations (POST/PUT/PATCH/DELETE) → network-only; queued via Background Sync
 *   Everything else                   → network-first with offline fallback
 *
 * Also handles Web Push (merged from push-sw.js) and skip-waiting for updates.
 */

const SHELL_CACHE = "glamly-shell-v1";
// Bumped v1→v2 to purge the previous cache, which (before this fix) stored
// authenticated per-user API responses containing PII (see isPublicCatalogGet).
const API_CACHE = "glamly-api-v2";
const SYNC_TAG = "glamly-mutation-sync";
const DB_NAME = "glamly-sync-queue";
const DB_STORE = "requests";

// App-shell routes pre-cached on install
const SHELL_URLS = [
  "/",
  "/offline",
  "/book-appointment",
  "/dashboard",
  "/Login",
  "/register",
  "/studio",
];

// Static asset prefixes cached on first fetch (cache-first)
const STATIC_PREFIXES = ["/_next/static/", "/icons/", "/images/"];

// API base — matches both dev (4000) and prod paths
const API_PATTERN = /\/api\/v1\//;

// Only PUBLIC, non-user-specific catalogue GETs may be cached (stale-while-revalidate).
// Authenticated/per-user responses (bookings, auth, admin, gift vouchers, /stylists/me…)
// MUST NOT be cached: they carry PII (customer name/phone/address) and would leak across
// sessions on a shared device or after logout, and would serve stale data after mutations.
// (CLAUDE.md §5 caching strategy + §10 PII handling.)
function isPublicCatalogGet(pathname) {
  if (pathname.startsWith("/api/v1/stylists/me")) return false; // authenticated storefront mgmt
  return (
    pathname.startsWith("/api/v1/stylists") || // list, public profile, availability, reviews
    pathname.startsWith("/api/v1/services") ||
    pathname.startsWith("/api/v1/packages")
  );
}

// ─── Install: pre-cache app shell ────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        Promise.allSettled(SHELL_URLS.map((url) => cache.add(url).catch(() => null)))
      )
      .then(() => self.skipWaiting())
  );
});

// ─── Activate: clean stale caches ────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== API_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch routing ───────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle http(s); skip chrome-extension etc.
  if (!url.protocol.startsWith("http")) return;

  // --- Static assets: cache-first ---
  if (STATIC_PREFIXES.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // --- API mutations: network-only + Background Sync queue ---
  if (API_PATTERN.test(url.pathname) && !["GET", "HEAD"].includes(request.method)) {
    event.respondWith(networkOnlyWithSync(request));
    return;
  }

  // --- API GETs ---
  if (API_PATTERN.test(url.pathname) && request.method === "GET") {
    // Public catalogue (no Authorization) → stale-while-revalidate for offline browsing.
    if (isPublicCatalogGet(url.pathname) && !request.headers.has("authorization")) {
      event.respondWith(staleWhileRevalidate(request, API_CACHE));
    } else {
      // Authenticated/per-user GETs are network-only — never cached (PII + freshness).
      event.respondWith(fetch(request));
    }
    return;
  }

  // --- Navigation requests: network-first → shell cache → /offline ---
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match("/offline"))
        )
    );
    return;
  }

  // --- Everything else: network-first ---
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ─── Strategy helpers ────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached); // network failed — caller gets stale or undefined

  // Return stale immediately if we have it; let revalidation happen in background
  return cached ?? fetchPromise;
}

async function networkOnlyWithSync(request) {
  try {
    return await fetch(request.clone());
  } catch {
    // Network failed — queue for Background Sync
    await enqueueRequest(request);
    await self.registration.sync.register(SYNC_TAG).catch(() => null);

    return new Response(
      JSON.stringify({
        success: false,
        error: { message: "You are offline. Your request has been queued.", code: "OFFLINE_QUEUED" },
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ─── Background Sync ─────────────────────────────────────────────────────────

self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(replayQueue());
  }
});

async function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore(DB_STORE, { keyPath: "id", autoIncrement: true });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function enqueueRequest(request) {
  const body = await request.clone().text().catch(() => "");
  const headers = {};
  request.headers.forEach((v, k) => { headers[k] = v; });

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).add({
      url: request.url,
      method: request.method,
      headers,
      body: body || undefined,
      timestamp: Date.now(),
    });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function replayQueue() {
  const db = await openDb();
  const items = await new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const req = tx.objectStore(DB_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  for (const item of items) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body,
        credentials: "include",
      });
      if (response.ok) {
        await deleteQueueItem(db, item.id);
        await notifyClients({ type: "SYNC_COMPLETE", url: item.url });
      }
      // Keep failed items in queue for next sync opportunity
    } catch {
      // Still offline — leave in queue
    }
  }
}

async function deleteQueueItem(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function notifyClients(payload) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of clients) client.postMessage(payload);
}

// ─── Message handling (skip-waiting for UpdatePrompt) ────────────────────────

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ─── Web Push (merged from push-sw.js) ───────────────────────────────────────

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Glamly", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Glamly";
  const options = {
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
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(targetUrl) && "focus" in client) return client.focus();
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
