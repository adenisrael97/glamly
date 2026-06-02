"use client";

import { useMemo, useState } from "react";
import type { BookingDTO } from "@glamly/shared";
import { bookingsApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useMyBookings } from "@/hooks/useBookings";
import { useAvailability } from "@/hooks/useStylists";
import { useRealtime } from "@/hooks/useRealtime";
import BookingCard from "@/components/features/BookingCard";

type Tab = "bookings" | "earnings" | "availability" | "profile";

const TABS: { id: Tab; label: string }[] = [
  { id: "bookings", label: "Bookings" },
  { id: "earnings", label: "Earnings" },
  { id: "availability", label: "Availability" },
  { id: "profile", label: "Profile" },
];

function formatDayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", { weekday: "short", month: "short", day: "numeric" });
}
function formatTimeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p className="text-2xl font-extrabold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

export default function StudioPage() {
  const { user, accessToken, status } = useAuth();
  const [tab, setTab] = useState<Tab>("bookings");

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
    return { total: bookings.length, upcoming, completed: completed.length, earnings };
  }, [bookings]);

  // No "my stylist profile" endpoint exists; derive the storefront id from a
  // booking so we can read the public availability feed (read-only).
  const stylistId = bookings[0]?.stylist.id ?? null;
  const { slots, isLoading: slotsLoading } = useAvailability(tab === "availability" ? stylistId : null, { days: 7 });

  const slotsByDay = useMemo(() => {
    const groups = new Map<string, typeof slots>();
    for (const s of slots) {
      const key = new Date(s.startTime).toDateString();
      const arr = groups.get(key) ?? [];
      arr.push(s);
      groups.set(key, arr);
    }
    return [...groups.entries()];
  }, [slots]);

  const completeBooking = async (id: string) => {
    try {
      await bookingsApi.complete(id);
      await mutate();
    } catch {
      // surfaced by revalidation
    }
  };

  const completableStatuses: BookingDTO["status"][] = ["PENDING", "CONFIRMED"];

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Studio</h1>
          {user && <p className="text-sm text-gray-500 mt-0.5">{user.name} · stylist</p>}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatTile label="Total bookings" value={stats.total} />
          <StatTile label="Upcoming" value={stats.upcoming} />
          <StatTile label="Completed" value={stats.completed} />
          <StatTile label="Earnings" value={`₦${stats.earnings.toLocaleString()}`} />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-none" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                tab === t.id ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-200 hover:border-purple-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Bookings */}
        {tab === "bookings" && (
          <section aria-label="Bookings">
            {isLoading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse" />
                ))}
              </div>
            ) : bookings.length === 0 ? (
              <p className="text-center text-gray-500 py-16 bg-white rounded-2xl border border-gray-100">No bookings yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {bookings.map((b) => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    perspective="provider"
                    actions={
                      completableStatuses.includes(b.status) ? (
                        <button
                          type="button"
                          onClick={() => completeBooking(b.id)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg"
                        >
                          Mark completed
                        </button>
                      ) : null
                    }
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Earnings */}
        {tab === "earnings" && (
          <section aria-label="Earnings" className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-sm text-gray-500">Total earned (completed bookings)</p>
              <p className="text-3xl font-extrabold text-purple-700 mt-1">₦{stats.earnings.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-2">Derived from {stats.completed} completed appointment(s).</p>
            </div>
            <div className="flex flex-col gap-3">
              {bookings.filter((b) => b.status === "COMPLETED").map((b) => (
                <BookingCard key={b.id} booking={b} perspective="provider" />
              ))}
            </div>
          </section>
        )}

        {/* Availability (read-only) */}
        {tab === "availability" && (
          <section aria-label="Availability" className="flex flex-col gap-4">
            <p className="text-sm text-gray-500">
              Your open slots over the next 7 days (derived from your working hours and existing bookings).
            </p>
            {!stylistId ? (
              <p className="text-sm text-gray-400">Availability appears once you have a booking on your storefront.</p>
            ) : slotsLoading ? (
              <p className="text-sm text-gray-400 animate-pulse">Loading availability…</p>
            ) : slotsByDay.length === 0 ? (
              <p className="text-sm text-gray-400">No open slots in the next 7 days.</p>
            ) : (
              slotsByDay.map(([day, daySlots]) => (
                <div key={day}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{formatDayLabel(daySlots[0].startTime)}</p>
                  <div className="flex flex-wrap gap-2">
                    {daySlots.map((s) => (
                      <span key={s.startTime} className="px-3 py-1.5 rounded-lg text-sm bg-white border border-gray-200 text-gray-700">
                        {formatTimeLabel(s.startTime)}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
            <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
              Editing working hours and toggling availability will be available once the matching API endpoints ship.
            </p>
          </section>
        )}

        {/* Profile (read-only) */}
        {tab === "profile" && user && (
          <section aria-label="Profile" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Name</span>
              <span className="text-sm font-semibold text-gray-900">{user.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Email</span>
              <span className="text-sm font-semibold text-gray-900">{user.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Role</span>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium capitalize">{user.role}</span>
            </div>
            <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
              Editing your storefront profile (bio, services, portfolio) will be available once the matching API
              endpoints ship.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
