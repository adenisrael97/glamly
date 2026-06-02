"use client";

import { usePWA } from "@/hooks/usePWA";

/**
 * Full-width top banner shown whenever the browser is offline.
 * Also shows a brief success notice when a queued request syncs.
 */
export function OfflineBanner() {
  const { isOnline, syncedOfflineRequest } = usePWA();

  if (isOnline && !syncedOfflineRequest) return null;

  if (syncedOfflineRequest) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed left-0 right-0 top-0 z-50 flex items-center justify-center gap-2 bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-md"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 shrink-0"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        Your queued request has been sent successfully.
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="assertive"
      className="fixed left-0 right-0 top-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-md"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 shrink-0"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      You&apos;re offline — some features may be unavailable. Changes will sync when you reconnect.
    </div>
  );
}
