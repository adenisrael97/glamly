"use client";

import { useEffect, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface PWAState {
  /** True while online */
  isOnline: boolean;
  /** True when a waiting SW exists (update available) */
  updateReady: boolean;
  /** True when the app can be installed (beforeinstallprompt fired) */
  installable: boolean;
  /** Call to trigger the browser's native install dialog */
  promptInstall(): Promise<boolean>;
  /** Call to activate the waiting SW and reload */
  applyUpdate(): void;
  /** True if we're running in standalone (installed) mode */
  isInstalled: boolean;
  /** True if a queued request has successfully synced */
  syncedOfflineRequest: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePWA(): PWAState {
  const [isOnline, setIsOnline] = useState(true);
  const [updateReady, setUpdateReady] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installable, setInstallable] = useState(false);
  const [syncedOfflineRequest, setSyncedOfflineRequest] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Online / offline + installed state are derived from browser-only globals.
  // Initialize to server-safe defaults and update once mounted to avoid
  // hydration mismatch between server and client render.
  useEffect(() => {
    setIsOnline(navigator.onLine);
    setIsInstalled(
      window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as { standalone?: boolean }).standalone === true,
    );

    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  // Install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Clear installable after it's added to home screen
  useEffect(() => {
    const handler = () => setInstallable(false);
    window.addEventListener("appinstalled", handler);
    return () => window.removeEventListener("appinstalled", handler);
  }, []);

  // SW update detection
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.ready.then((reg) => {
      // Catch an already-waiting worker on mount
      if (reg.waiting) setUpdateReady(true);

      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            setUpdateReady(true);
          }
        });
      });
    });

    // React to controller change (fired after skipWaiting completes)
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });

    // Listen for background-sync completion messages from the SW
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "SYNC_COMPLETE") {
        setSyncedOfflineRequest(true);
        setTimeout(() => setSyncedOfflineRequest(false), 5000);
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setInstallable(false);
    return outcome === "accepted";
  }, [deferredPrompt]);

  const applyUpdate = useCallback(() => {
    navigator.serviceWorker.ready.then((reg) => {
      reg.waiting?.postMessage({ type: "SKIP_WAITING" });
    });
  }, []);

  return { isOnline, updateReady, installable, promptInstall, applyUpdate, isInstalled, syncedOfflineRequest };
}
