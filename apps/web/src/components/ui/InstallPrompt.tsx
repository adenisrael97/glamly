"use client";

import { usePWA } from "@/hooks/usePWA";
import { useState } from "react";

/**
 * Floating install-to-home-screen banner.
 * Shown only when the browser has fired beforeinstallprompt and the app is not
 * already installed in standalone mode.
 */
export function InstallPrompt() {
  const { installable, promptInstall, isInstalled } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  if (!installable || isInstalled || dismissed) return null;

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (!accepted) setDismissed(true);
  };

  return (
    <div
      role="banner"
      aria-label="Install Glamly app"
      className="fixed bottom-4 left-4 right-4 z-50 flex items-center gap-4 rounded-2xl border border-rose-100 bg-white px-4 py-3 shadow-xl sm:left-auto sm:right-6 sm:w-80"
    >
      {/* Icon */}
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-600">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-6 w-6 text-white"
          aria-hidden="true"
        >
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-8.5l-2-2-1.5 1.5 3.5 3.5 7-7-1.5-1.5-5.5 5.5z" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">Add Glamly to your home screen</p>
        <p className="mt-0.5 text-xs text-gray-500 truncate">Fast access, works offline</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={handleInstall}
          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-1"
        >
          Install
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss install prompt"
          className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-1 rounded"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
