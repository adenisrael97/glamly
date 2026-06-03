"use client";

import { useState } from "react";
import useSWR from "swr";
import type { AvailabilityResult } from "@glamly/shared";
import { useAuth } from "@/context/AuthContext";
import { useMyBookings } from "@/hooks/useBookings";
import { stylistMeApi } from "@/lib/api/stylist-me";
import { stylistsApi } from "@/lib/api/stylists";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Working hours grid: 9 AM – 5 PM (9 slots of 1 hour each, last start at 17:00) */
const HOURS = Array.from({ length: 9 }, (_, i) => i + 9); // [9,10,...,17]

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Return ISO date string YYYY-MM-DD for `daysFromToday` offset. */
function offsetDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
}

/** Build a map: dayIndex (0–6) → Set of UTC hours that are booked. */
function buildBookedMap(slots: AvailabilityResult["slots"], from: Date): Map<number, Set<number>> {
  const map = new Map<number, Set<number>>();
  for (const slot of slots) {
    const start = new Date(slot.startTime);
    const diffMs = start.getTime() - from.getTime();
    const dayIndex = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (dayIndex < 0 || dayIndex >= 7) continue;
    if (!map.has(dayIndex)) map.set(dayIndex, new Set());
    map.get(dayIndex)!.add(start.getUTCHours());
  }
  return map;
}

function formatDayHeader(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return d.toLocaleDateString("en-NG", { month: "short", day: "numeric" });
}

function formatHour(hour: number): string {
  const period = hour < 12 ? "am" : "pm";
  const h = hour <= 12 ? hour : hour - 12;
  return `${h}${period}`;
}

// ─── Availability toggle ──────────────────────────────────────────────────────

function AvailabilityToggle({
  isAvailable,
  onToggle,
  busy,
}: {
  isAvailable: boolean;
  onToggle: () => void;
  busy: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-700">Accept new bookings</span>
      <button
        type="button"
        role="switch"
        aria-checked={isAvailable}
        onClick={onToggle}
        disabled={busy}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:opacity-50 ${
          isAvailable ? "bg-purple-600" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
            isAvailable ? "translate-x-6" : "translate-x-1"
          }`}
        />
        <span className="sr-only">{isAvailable ? "Available" : "Unavailable"}</span>
      </button>
      <span
        className={`text-sm font-semibold ${
          isAvailable ? "text-green-600" : "text-gray-400"
        }`}
      >
        {isAvailable ? "Available" : "Unavailable"}
      </span>
    </div>
  );
}

// ─── Weekly grid ──────────────────────────────────────────────────────────────

function WeeklyGrid({
  bookedMap,
  fromDate,
}: {
  bookedMap: Map<number, Set<number>>;
  fromDate: Date;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs min-w-[480px]" aria-label="Weekly availability grid">
        <thead>
          <tr>
            <th className="w-14 py-2 text-right pr-3 text-gray-400 font-normal" aria-label="Time" />
            {Array.from({ length: 7 }, (_, dayIdx) => {
              const d = new Date(fromDate);
              d.setDate(d.getDate() + dayIdx);
              const dayName = DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1];
              return (
                <th
                  key={dayIdx}
                  scope="col"
                  className="text-center py-2 px-1 font-semibold text-gray-600"
                >
                  <span className="block">{dayName}</span>
                  <span className="block text-gray-400 font-normal">
                    {formatDayHeader(dayIdx)}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {HOURS.map((hour) => (
            <tr key={hour} className="border-t border-gray-100">
              <td className="py-1.5 pr-3 text-right text-gray-400 whitespace-nowrap">
                {formatHour(hour)}
              </td>
              {Array.from({ length: 7 }, (_, dayIdx) => {
                const dayHours = bookedMap.get(dayIdx);
                // The availability endpoint returns FREE slots (open for booking).
                // A slot present in the result = available. We highlight those in purple.
                const isOpen = dayHours?.has(hour) ?? false;
                return (
                  <td
                    key={dayIdx}
                    className="py-1 px-1 text-center"
                    aria-label={`${DAY_LABELS[dayIdx]} at ${formatHour(hour)}: ${isOpen ? "available" : "booked"}`}
                  >
                    <div
                      className={`h-6 rounded ${
                        isOpen
                          ? "bg-purple-500"
                          : "bg-gray-100"
                      }`}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-purple-500" aria-hidden="true" />
          Open slot
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-gray-100 border border-gray-200" aria-hidden="true" />
          Booked / unavailable
        </span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AvailabilityPage() {
  const { status } = useAuth();
  const enabled = status === "authenticated";

  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [toggleBusy, setToggleBusy] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  // Derive stylistId from bookings (same pattern as original studio page).
  const { bookings, isLoading: bookingsLoading } = useMyBookings({ limit: 5 }, enabled);
  const stylistId = bookings[0]?.stylistId ?? null;

  const fromDateStr = offsetDate(0);
  const fromDate = new Date(fromDateStr + "T00:00:00Z");

  // Fetch availability slots for the 7-day grid.
  const { data: availData, isLoading: slotsLoading } = useSWR<AvailabilityResult>(
    stylistId && enabled ? ["stylist-availability-grid", stylistId] : null,
    () => stylistsApi.getAvailability(stylistId!, { date: fromDateStr, days: 7 }),
    { revalidateOnFocus: false, keepPreviousData: true },
  );

  // Initialise the toggle from the availability response on first load.
  if (availData && isAvailable === null) {
    setIsAvailable(availData.isAvailable);
  }

  const bookedMap = availData
    ? buildBookedMap(availData.slots, fromDate)
    : new Map<number, Set<number>>();

  const effectiveIsAvailable = isAvailable ?? availData?.isAvailable ?? false;

  const handleToggle = async () => {
    const next = !effectiveIsAvailable;
    setIsAvailable(next);
    setToggleBusy(true);
    setToggleError(null);
    try {
      await stylistMeApi.updateProfile({ isAvailable: next });
    } catch (err) {
      // Revert on failure.
      setIsAvailable(!next);
      setToggleError(err instanceof Error ? err.message : "Failed to update availability.");
    } finally {
      setToggleBusy(false);
    }
  };

  const isGridLoading = bookingsLoading || (!!stylistId && slotsLoading && !availData);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Availability</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage your open slots and control whether you accept new bookings.
        </p>
      </div>

      {/* Toggle card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Status</h2>
        <AvailabilityToggle
          isAvailable={effectiveIsAvailable}
          onToggle={() => void handleToggle()}
          busy={toggleBusy}
        />
        {toggleError && (
          <p role="alert" className="text-xs text-red-600 mt-2">
            {toggleError}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-3">
          When unavailable, your profile won&rsquo;t appear in customer searches and new bookings
          will be blocked.
        </p>
      </div>

      {/* Weekly grid */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          7-day slot overview
          <span className="ml-2 text-xs text-gray-400 font-normal">(9 AM – 6 PM)</span>
        </h2>

        {isGridLoading ? (
          <div className="space-y-2 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-2">
                <div className="h-6 w-12 bg-gray-100 rounded" />
                {Array.from({ length: 7 }).map((__, j) => (
                  <div key={j} className="h-6 flex-1 bg-gray-100 rounded" />
                ))}
              </div>
            ))}
          </div>
        ) : !stylistId ? (
          <p className="text-sm text-gray-400">
            Your slot grid will appear once you have at least one booking on your storefront.
          </p>
        ) : (
          <WeeklyGrid bookedMap={bookedMap} fromDate={fromDate} />
        )}
      </div>
    </div>
  );
}
