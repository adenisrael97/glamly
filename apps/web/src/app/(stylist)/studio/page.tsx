"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useMyBookings } from "@/hooks/useBookings";
import { useRealtime } from "@/hooks/useRealtime";

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  isLoading,
}: {
  label: string;
  value: string | number;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
        <div className="h-7 bg-gray-200 rounded w-1/2 mb-2" />
        <div className="h-4 bg-gray-100 rounded w-3/4" />
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-2xl font-extrabold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

// ─── Quick action card ────────────────────────────────────────────────────────

function ActionCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-purple-200 transition-all p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:rounded-2xl"
    >
      <p className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">
        {title}
      </p>
      <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      <span className="inline-block mt-3 text-xs font-semibold text-purple-600 group-hover:underline">
        Open &rarr;
      </span>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudioOverviewPage() {
  const { user, accessToken, status } = useAuth();
  const enabled = status === "authenticated";

  const { bookings, isLoading, mutate } = useMyBookings({ limit: 50 }, enabled);

  useRealtime(accessToken, {
    onBookingConfirmed: () => void mutate(),
    onBookingCancelled: () => void mutate(),
  });

  const stats = useMemo(() => {
    const upcoming = bookings.filter((b) => b.status === "CONFIRMED").length;
    const completed = bookings.filter((b) => b.status === "COMPLETED");
    const earnings = completed.reduce((sum, b) => sum + b.totalAmount, 0);
    // Average rating: not available from bookings; show placeholder
    return { upcoming, earnings };
  }, [bookings]);

  // Derive stylist profile info from the auth user. Status comes from the user
  // object that the API returns on login/refresh. The API embeds `stylistStatus`
  // on the AuthUser when the role is STYLIST.
  const stylistStatus = (user as (typeof user & { stylistStatus?: string }) | null)
    ?.stylistStatus;

  const isPendingApproval = stylistStatus === "PENDING_APPROVAL";

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Studio Overview</h1>
        {user && (
          <p className="text-sm text-gray-500 mt-0.5">
            {user.name} &middot; Stylist
          </p>
        )}
      </div>

      {/* Pending approval banner */}
      {isPendingApproval && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3"
        >
          <svg
            className="mt-0.5 shrink-0 text-yellow-600"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p className="text-sm text-yellow-800 font-medium">
            Your profile is awaiting admin approval. You cannot accept bookings yet.
          </p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard
          label="Upcoming bookings"
          value={stats.upcoming}
          isLoading={isLoading}
        />
        <StatCard
          label="Total earnings (₦)"
          value={`₦${stats.earnings.toLocaleString("en-NG")}`}
          isLoading={isLoading}
        />
        <StatCard label="Average rating" value="—" isLoading={false} />
        <StatCard label="Total reviews" value="—" isLoading={false} />
      </div>

      {/* Quick actions */}
      <section aria-label="Quick actions">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Quick actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ActionCard
            href="/studio/services"
            title="Manage Services"
            description="Add, edit, or deactivate services you offer."
          />
          <ActionCard
            href="/studio/packages"
            title="Manage Packages"
            description="Bundle services into packages with a fixed price."
          />
          <ActionCard
            href="/studio/bookings"
            title="View Bookings"
            description="See upcoming, pending, and past appointments."
          />
          <ActionCard
            href="/studio/profile"
            title="Edit Profile"
            description="Update your bio, photo, specialty, and portfolio."
          />
        </div>
      </section>
    </div>
  );
}
