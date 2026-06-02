"use client";

export function OfflineRetryButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="rounded-lg bg-rose-600 px-6 py-3 font-medium text-white transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
    >
      Try again
    </button>
  );
}
