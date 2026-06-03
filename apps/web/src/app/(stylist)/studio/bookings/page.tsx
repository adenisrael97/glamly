"use client";

import { useState } from "react";
import type { BookingDTO, BookingStatus } from "@glamly/shared";
import { useAuth } from "@/context/AuthContext";
import { useMyBookings } from "@/hooks/useBookings";
import { useRealtime } from "@/hooks/useRealtime";
import { stylistMeApi } from "@/lib/api/stylist-me";
import { BOOKING_STATUS_STYLES } from "@/components/features/BookingCard";

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "upcoming" | "pending" | "past";

const TABS: { id: Tab; label: string; statuses: BookingStatus[] }[] = [
  { id: "upcoming", label: "Upcoming", statuses: ["CONFIRMED"] },
  { id: "pending", label: "Pending", statuses: ["PENDING"] },
  { id: "past", label: "Past", statuses: ["COMPLETED", "CANCELLED"] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-NG", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function serviceLabel(booking: BookingDTO): string {
  if (booking.service) return booking.service.name;
  if (booking.services.length > 0) {
    return booking.services.map((l) => l.service.name).join(", ");
  }
  return "—";
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function BookingSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse space-y-3">
      <div className="flex justify-between">
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-100 rounded w-16" />
      </div>
      <div className="h-3 bg-gray-100 rounded w-1/2" />
      <div className="h-3 bg-gray-100 rounded w-1/4" />
    </div>
  );
}

// ─── Provider booking card ────────────────────────────────────────────────────

interface ProviderBookingCardProps {
  booking: BookingDTO;
  onComplete: (id: string) => Promise<void>;
}

function ProviderBookingCard({ booking, onComplete }: ProviderBookingCardProps) {
  const [busy, setBusy] = useState(false);
  const status = BOOKING_STATUS_STYLES[booking.status];

  const handleComplete = async () => {
    setBusy(true);
    try {
      await onComplete(booking.id);
    } finally {
      setBusy(false);
    }
  };

  const canComplete = booking.status === "CONFIRMED" || booking.status === "PENDING";

  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 truncate">{serviceLabel(booking)}</p>
          <p className="text-sm text-gray-500 mt-0.5">{formatWhen(booking.startTime)}</p>

          {/* Customer contact — visible only to the assigned stylist (provider view). */}
          {booking.user && (
            <div className="mt-2 space-y-0.5">
              <p className="text-sm font-medium text-gray-700">{booking.user.name}</p>
              {booking.user.phone && (
                <p className="text-xs text-gray-500">📞 {booking.user.phone}</p>
              )}
              {booking.user.address && (
                <p className="text-xs text-gray-500">📍 {booking.user.address}</p>
              )}
            </div>
          )}

          {/* Services breakdown for multi-service bookings */}
          {booking.services.length > 1 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {booking.services.map((l) => (
                <span
                  key={l.id}
                  className="text-xs bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full"
                >
                  {l.service.name}
                </span>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-400 mt-1">
            Booking #{booking.id.slice(-6).toUpperCase()}
          </p>
        </div>
        <span
          className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border ${status.cls}`}
        >
          {status.label}
        </span>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <span className="text-purple-700 font-bold">
          ₦{booking.totalAmount.toLocaleString("en-NG")}
        </span>
        {canComplete && (
          <button
            type="button"
            onClick={() => void handleComplete()}
            disabled={busy}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 transition-colors"
          >
            {busy ? "Saving…" : "Mark complete"}
          </button>
        )}
      </div>
    </article>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyBookings({ label }: { label: string }) {
  return (
    <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
      <p className="text-gray-500">No {label.toLowerCase()} bookings.</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProviderBookingsPage() {
  const { accessToken, status: authStatus } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");

  const enabled = authStatus === "authenticated";

  // The STYLIST role gets the provider view from /bookings/me.
  // We fetch all bookings and filter client-side to avoid separate SWR keys
  // re-fetching when switching tabs (the data is small).
  const { bookings, isLoading, isError, mutate } = useMyBookings(
    { limit: 50 },
    enabled,
  );

  useRealtime(accessToken, {
    onBookingConfirmed: () => void mutate(),
    onBookingCancelled: () => void mutate(),
  });

  const handleComplete = async (id: string) => {
    await stylistMeApi.completeBooking(id);
    await mutate();
  };

  const currentTabDef = TABS.find((t) => t.id === activeTab)!;
  const filtered = bookings.filter((b) =>
    (currentTabDef.statuses as readonly BookingStatus[]).includes(b.status),
  );

  // Tab badge counts
  const counts: Record<Tab, number> = {
    upcoming: bookings.filter((b) => b.status === "CONFIRMED").length,
    pending: bookings.filter((b) => b.status === "PENDING").length,
    past: bookings.filter(
      (b) => b.status === "COMPLETED" || b.status === "CANCELLED",
    ).length,
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your appointment schedule</p>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-none"
        role="tablist"
        aria-label="Booking status filter"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
              activeTab === tab.id
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-purple-300"
            }`}
          >
            {tab.label}
            {counts[tab.id] > 0 && (
              <span
                className={`inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] text-xs rounded-full font-bold ${
                  activeTab === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-purple-100 text-purple-700"
                }`}
              >
                {counts[tab.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <BookingSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <p role="alert" className="text-sm text-red-600">
          Couldn&apos;t load bookings. Please try again.
        </p>
      ) : filtered.length === 0 ? (
        <EmptyBookings label={currentTabDef.label} />
      ) : (
        <div
          className="space-y-3"
          role="tabpanel"
          aria-label={`${currentTabDef.label} bookings`}
        >
          {filtered.map((b) => (
            <ProviderBookingCard key={b.id} booking={b} onComplete={handleComplete} />
          ))}
        </div>
      )}
    </div>
  );
}
