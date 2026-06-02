"use client";

import { useState } from "react";
import { isPushSupported, subscribeToPush, unsubscribeFromPush } from "@/lib/push";
import { useAuth } from "@/context/AuthContext";

/**
 * Toggle button for push notification permission.
 * Intended for settings pages and user profile areas.
 * Renders nothing if push is not supported by the browser.
 */
export function PushPermissionButton() {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isPushSupported()) return null;

  const toggle = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      if (subscribed) {
        await unsubscribeFromPush({ token: accessToken });
        setSubscribed(false);
      } else {
        const sub = await subscribeToPush({ token: accessToken });
        setSubscribed(Boolean(sub));
        if (!sub) {
          setError("Notification permission was denied.");
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={toggle}
        disabled={loading || !accessToken}
        aria-pressed={subscribed}
        className={[
          "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition",
          "focus:outline-none focus:ring-2 focus:ring-offset-2",
          subscribed
            ? "bg-rose-100 text-rose-700 hover:bg-rose-200 focus:ring-rose-400"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-400",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        ].join(" ")}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 shrink-0"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 01-2-2h4a2 2 0 01-2 2z" />
        </svg>
        {loading ? "…" : subscribed ? "Notifications on" : "Enable notifications"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
