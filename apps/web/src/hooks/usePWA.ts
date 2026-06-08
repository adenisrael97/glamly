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
  /** True when the app can be installed (beforeinstallprompt fired) */
  installable: boolean;
  /** Call to trigger the browser's native install dialog */
  promptInstall(): Promise<boolean>;
  /** True if we're running in standalone (installed) mode */
  isInstalled: boolean;
  /** True if a queued request has successfully synced */
  syncedOfflineRequest: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePWA(): PWAState {
  // Lazy initialisers read browser-only globals (navigator, window) which don't
  // exist on the server. The typeof guards return the safe server-side default so
  // SSR renders consistently; on the client the actual values are used from the
  // very first render, avoiding the need to call setState inside an effect body
  // (which the react-hooks/set-state-in-effect rule disallows).
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true
    );
  });
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installable, setInstallable] = useState(false);
  const [syncedOfflineRequest, setSyncedOfflineRequest] = useState(false);

  // Subscribe to online/offline changes. Initial values are handled by the lazy
  // initialisers above so no synchronous setState is needed here.
  useEffect(() => {
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

  // Service-worker bridge: silently reload onto a new version, and surface
  // background-sync completions. Registration itself is handled by Serwist
  // (next.config `register: true`); this hook only reacts to the SW lifecycle.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Serwist's worker uses skipWaiting + clientsClaim, so a new deploy's worker
    // activates and takes control immediately, firing `controllerchange`. Reload
    // once so the page swaps to the new assets — but ONLY when the page was
    // already controlled by an older worker (a genuine update), never on the
    // first-ever install claiming an uncontrolled page. `refreshing` guards loops.
    const hadController = navigator.serviceWorker.controller !== null;
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing || !hadController) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    // Background-sync completion messages from the SW (offline mutations replayed).
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "SYNC_COMPLETE") {
        setSyncedOfflineRequest(true);
        setTimeout(() => setSyncedOfflineRequest(false), 5000);
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setInstallable(false);
    return outcome === "accepted";
  }, [deferredPrompt]);

  return { isOnline, installable, promptInstall, isInstalled, syncedOfflineRequest };
}
