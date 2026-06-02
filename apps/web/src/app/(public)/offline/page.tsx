import type { Metadata } from "next";
import Link from "next/link";
import { OfflineRetryButton } from "./retry-button";

export const metadata: Metadata = {
  title: "You're Offline",
  description: "It looks like you've lost your internet connection.",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-rose-100">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12 text-rose-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3l18 18M8.288 8.288A7.501 7.501 0 0112 7.5c1.977 0 3.776.76 5.123 2.003M12 12a3 3 0 013 3m-6 0a3 3 0 016 0m-3 3v.01M1.181 5.777A14.991 14.991 0 0112 3a14.97 14.97 0 018.5 2.604"
          />
        </svg>
      </div>

      <h1 className="mb-3 text-3xl font-bold text-gray-900">You&apos;re offline</h1>
      <p className="mb-2 max-w-sm text-gray-500">
        It looks like you&apos;ve lost your internet connection. Some content may still be
        available from your last visit.
      </p>
      <p className="mb-8 max-w-sm text-sm text-gray-400">
        Any bookings or requests made while offline will be sent automatically when you reconnect.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <OfflineRetryButton />
        <Link
          href="/"
          className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
