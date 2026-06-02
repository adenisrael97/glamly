"use client";

import { useState } from "react";
import Link from "next/link";
import type { BookingStatus } from "@glamly/shared";
import { useAuth } from "@/context/AuthContext";
import { useMyBookings } from "@/hooks/useBookings";
import { useRealtime } from "@/hooks/useRealtime";
import BookingCard from "@/components/features/BookingCard";

const FILTERS: { label: string; value: BookingStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export default function DashboardPage() {
  const { user, accessToken, status: authStatus } = useAuth();
  const [filter, setFilter] = useState<BookingStatus | "ALL">("ALL");

  const enabled = authStatus === "authenticated";
  const { bookings, isLoading, isError, mutate } = useMyBookings(
    filter === "ALL" ? {} : { status: filter },
    enabled,
  );

  // Live updates when a booking is confirmed/cancelled elsewhere.
  useRealtime(accessToken, {
    onBookingConfirmed: () => void mutate(),
    onBookingCancelled: () => void mutate(),
  });

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My bookings</h1>
            {user && <p className="text-sm text-gray-500 mt-0.5">Welcome back, {user.name.split(" ")[0]}.</p>}
          </div>
          <Link href="/stylist" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg">
            Book again
          </Link>
        </div>

        {/* Status filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-none">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                filter === f.value
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-purple-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <p role="alert" className="text-sm text-red-600">Couldn&apos;t load your bookings. Please try again.</p>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <p className="text-gray-500 mb-4">No bookings here yet.</p>
            <Link href="/stylist" className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl">
              Find a stylist
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {bookings.map((b) => (
              <BookingCard key={b.id} booking={b} perspective="customer" href={`/booking/${b.id}`} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
