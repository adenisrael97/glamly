"use client";

import { useEffect } from "react";

/**
 * Registers the main PWA service worker (sw.js) once the page is idle.
 * Placed in the root layout so it runs on every page.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[SW] Registration failed:", err);
          }
        });
    };

    // Defer until idle so it does not compete with page load resources.
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void) => void;
    };
    if (typeof w.requestIdleCallback === "function") {
      w.requestIdleCallback(register);
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}
