"use client";

import { usePWA } from "@/hooks/usePWA";

/**
 * Toast that appears when a new service worker is waiting.
 * Clicking "Update" posts SKIP_WAITING to the SW, which triggers a controller
 * change, and usePWA reloads the page.
 */
export function UpdatePrompt() {
  const { updateReady, applyUpdate } = usePWA();

  if (!updateReady) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="App update available"
      className="fixed bottom-20 left-4 right-4 z-50 flex items-center gap-3 rounded-2xl border border-blue-100 bg-white px-4 py-3 shadow-xl sm:bottom-6 sm:left-auto sm:right-6 sm:w-80"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-blue-600"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">Update available</p>
        <p className="mt-0.5 text-xs text-gray-500">Refresh to get the latest version</p>
      </div>

      <button
        onClick={applyUpdate}
        className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
      >
        Update
      </button>
    </div>
  );
}
