"use client";

import { useEffect } from "react";

/**
 * Development-only safety net. Serwist does not register a service worker in dev
 * (next.config `disable`), but a worker installed by a previous production build
 * or visit would keep controlling the page and serving stale chunks — exactly the
 * staleness this migration removes. This unregisters any such worker and drops its
 * caches so dev always reflects the latest code (HMR is the source of truth).
 *
 * No-op in production, where Serwist owns the (correct, revisioned) worker.
 */
export function SWDevCleanup() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .catch(() => {});

    if (typeof caches !== "undefined") {
      void caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => {});
    }
  }, []);

  return null;
}
