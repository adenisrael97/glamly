"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

// Shown to stylists whose storefront is not APPROVED. The (stylist) layout
// redirects non-APPROVED stylists here so they don't reach the working studio
// (the backend already blocks them from being booked or listed publicly).

const COPY: Record<string, { title: string; body: string; tone: string }> = {
  PENDING_APPROVAL: {
    title: "Your profile is under review",
    body:
      "Thanks for signing up! Our team is reviewing your stylist profile. Once approved, you'll be able to manage services, accept bookings, and appear in customer searches. This usually takes 1–2 business days.",
    tone: "yellow",
  },
  SUSPENDED: {
    title: "Your account is suspended",
    body:
      "Your stylist account is currently suspended, so you can't accept new bookings. If you think this is a mistake, please contact Glamly support to resolve it.",
    tone: "red",
  },
  REJECTED: {
    title: "Your application wasn't approved",
    body:
      "Unfortunately your stylist application wasn't approved at this time. If you'd like more detail or want to re-apply, please reach out to Glamly support.",
    tone: "red",
  },
};

export default function StudioPendingPage() {
  const { user, logout } = useAuth();
  const status = (user?.stylistStatus as string | undefined) ?? "PENDING_APPROVAL";
  const copy = COPY[status] ?? COPY.PENDING_APPROVAL;
  const toneClasses =
    copy.tone === "red"
      ? "bg-red-50 border-red-200 text-red-800"
      : "bg-yellow-50 border-yellow-200 text-yellow-800";

  return (
    <div className="max-w-lg mx-auto py-10">
      <div className={`rounded-2xl border p-6 ${toneClasses}`} role="status" aria-live="polite">
        <div className="flex items-start gap-3">
          <svg
            className="mt-0.5 shrink-0"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <h1 className="text-lg font-bold mb-1">{copy.title}</h1>
            <p className="text-sm leading-relaxed">{copy.body}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-6">
        <Link
          href="/"
          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
        >
          Back to Glamly
        </Link>
        <button
          type="button"
          onClick={() => void logout()}
          className="px-5 py-2.5 border border-gray-300 hover:border-purple-400 text-gray-700 text-sm font-semibold rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
