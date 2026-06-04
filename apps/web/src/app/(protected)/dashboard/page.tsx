"use client";

import { useState, type FormEvent } from "react";
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

// ─── Profile (name / phone / address) ─────────────────────────────────────────
//
// Customers register with only name/email/password, so phone + a service/home
// address are captured here. Stylists need these to reach the customer and to
// know where a home appointment is.
function ProfileSection() {
  const { user, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState({ name: "", phone: "", address: "" });

  if (!user) return null;

  const startEdit = () => {
    setFields({ name: user.name ?? "", phone: user.phone ?? "", address: user.address ?? "" });
    setError(null);
    setEditing(true);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        name: fields.name.trim(),
        phone: fields.phone.trim(),
        address: fields.address.trim(),
      });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update your profile.");
    } finally {
      setSaving(false);
    }
  };

  const Row = ({ label, value }: { label: string; value: string | null }) => (
    <div className="flex justify-between gap-4 py-1.5">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">
        {value || <span className="text-gray-400 italic">Not set</span>}
      </span>
    </div>
  );

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent";

  return (
    <section
      aria-label="Your profile"
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900">Your profile</h2>
        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            className="text-sm font-semibold text-purple-600 hover:text-purple-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded px-1"
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={save} className="flex flex-col gap-3" noValidate>
          <div className="flex flex-col gap-1">
            <label htmlFor="pf-name" className="text-sm font-medium text-gray-700">Full name</label>
            <input id="pf-name" className={inputClass} value={fields.name}
              onChange={(e) => setFields((f) => ({ ...f, name: e.target.value }))} autoComplete="name" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="pf-phone" className="text-sm font-medium text-gray-700">Phone number</label>
            <input id="pf-phone" type="tel" className={inputClass} value={fields.phone}
              onChange={(e) => setFields((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+234 800 000 0000" autoComplete="tel" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="pf-address" className="text-sm font-medium text-gray-700">Address</label>
            <input id="pf-address" className={inputClass} value={fields.address}
              onChange={(e) => setFields((f) => ({ ...f, address: e.target.value }))}
              placeholder="Street, area, city" autoComplete="street-address" />
          </div>
          {error && <p role="alert" aria-live="assertive" className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 mt-1">
            <button type="submit" disabled={saving} aria-busy={saving}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2">
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button type="button" onClick={() => setEditing(false)} disabled={saving}
              className="px-4 py-2 border border-gray-300 hover:border-purple-400 text-gray-700 text-sm font-semibold rounded-lg">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="divide-y divide-gray-100">
          <Row label="Name" value={user.name} />
          <Row label="Email" value={user.email} />
          <Row label="Phone" value={user.phone} />
          <Row label="Address" value={user.address} />
        </div>
      )}
    </section>
  );
}

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

        {/* Profile (name / phone / address) */}
        <ProfileSection />

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
