"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { AvailabilitySlot, StylistServiceSummary } from "@glamly/shared";
import { ApiError, bookingsApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useStylist, useAvailability } from "@/hooks/useStylists";
import { useStylists } from "@/hooks/useStylists";
import { StylistCardSkeleton } from "@/components/ui/Skeleton";

const STEPS = ["Service", "Date & Time", "Confirm"];

const SpinnerIcon = () => (
  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center mb-8">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                  done
                    ? "bg-green-500 border-green-500 text-white"
                    : active
                      ? "bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-200"
                      : "bg-white border-gray-300 text-gray-400"
                }`}
              >
                {done ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step
                )}
              </div>
              <span className={`text-xs font-medium hidden md:block whitespace-nowrap ${active ? "text-purple-700" : done ? "text-green-600" : "text-gray-400"}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-5 transition-all duration-300 ${done ? "bg-green-400" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatDayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", { weekday: "short", month: "short", day: "numeric" });
}
function formatTimeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
}

// ── Stylist picker (no ?stylistId yet) ──────────────────────────────────────────

function StylistPicker() {
  const { stylists, isLoading } = useStylists({ available: true, limit: 9, sort: "rating", order: "desc" });
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Book an appointment</h1>
      <p className="text-gray-500 text-sm mb-6">Choose a stylist to get started.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <StylistCardSkeleton key={i} />)
          : stylists.map((s) => (
              <Link
                key={s.id}
                href={`/book-appointment?stylistId=${s.id}`}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all p-5 flex flex-col"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-gray-900">{s.user.name}</h3>
                  <span className="text-xs text-yellow-700 font-semibold">★ {s.rating.toFixed(1)}</span>
                </div>
                <p className="text-sm text-gray-500">{s.specialty} · {s.location}</p>
                <p className="mt-3 text-purple-700 font-extrabold">From ₦{s.priceFrom.toLocaleString()}</p>
                <span className="mt-4 text-center px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg">Select</span>
              </Link>
            ))}
      </div>
    </div>
  );
}

// ── Main booking flow (stylist chosen) ──────────────────────────────────────────

function BookFlow({ stylistId, initialServiceId }: { stylistId: string; initialServiceId: string | null }) {
  const router = useRouter();
  const { user, status } = useAuth();
  const { stylist, isLoading, isError } = useStylist(stylistId);

  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState<string | null>(initialServiceId);
  const [slot, setSlot] = useState<AvailabilitySlot | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Stable idempotency key for this booking attempt (CLAUDE.md §11).
  const [idempotencyKey] = useState(() => (typeof crypto !== "undefined" ? crypto.randomUUID() : `${stylistId}-${Date.now()}`));

  const service: StylistServiceSummary | undefined = useMemo(
    () => stylist?.services.find((s) => s.id === serviceId),
    [stylist, serviceId],
  );

  const { slots, isLoading: slotsLoading } = useAvailability(
    step >= 2 && serviceId ? stylistId : null,
    { serviceId: serviceId ?? undefined, days: 14 },
  );

  const slotsByDay = useMemo(() => {
    const groups = new Map<string, AvailabilitySlot[]>();
    for (const s of slots) {
      const key = new Date(s.startTime).toDateString();
      const arr = groups.get(key) ?? [];
      arr.push(s);
      groups.set(key, arr);
    }
    return [...groups.entries()];
  }, [slots]);

  if (isLoading) {
    return <div className="max-w-3xl mx-auto px-4 py-20 text-center text-purple-600 animate-pulse">Loading stylist…</div>;
  }
  if (isError || !stylist) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-600 mb-4">We couldn&apos;t load that stylist.</p>
        <Link href="/stylist" className="text-purple-600 font-semibold">Browse stylists →</Link>
      </div>
    );
  }

  const goNext = () => {
    if (step === 1 && !serviceId) {
      setError("Please select a service");
      return;
    }
    if (step === 2 && !slot) {
      setError("Please pick a time slot");
      return;
    }
    setError(null);
    setStep((s) => Math.min(STEPS.length, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  const handleConfirm = async () => {
    if (!serviceId || !slot) return;
    if (status !== "authenticated" || !user) {
      router.push(`/Login?next=${encodeURIComponent(`/book-appointment?stylistId=${stylistId}&serviceId=${serviceId}`)}`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const booking = await bookingsApi.create({
        stylistId,
        serviceIds: [serviceId],
        startTime: slot.startTime,
        notes: notes.trim() || undefined,
        idempotencyKey,
      });
      router.push(`/booking/${booking.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the booking. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-linear-to-r from-purple-900 via-purple-800 to-purple-700 text-white py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <Link href={`/stylist/${stylist.id}`} className="text-purple-300 hover:text-white text-sm flex items-center gap-1 mb-4 transition-colors">
            ← Back to {stylist.user.name}
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold">Book {stylist.user.name}</h1>
          <p className="text-purple-200 text-sm mt-1">{stylist.specialty} · {stylist.location}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <StepBar current={step} />

        {error && (
          <div role="alert" className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* STEP 1: Service */}
        {step === 1 && (
          <section aria-label="Choose a service" className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-gray-700">Choose a service</h2>
            {stylist.services.length === 0 && (
              <p className="text-sm text-gray-500">This stylist hasn&apos;t listed any services yet.</p>
            )}
            {stylist.services.map((svc) => {
              const selected = svc.id === serviceId;
              return (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => {
                    setServiceId(svc.id);
                    setSlot(null);
                    setError(null);
                  }}
                  className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                    selected ? "border-purple-500 bg-purple-50 ring-1 ring-purple-300" : "border-gray-200 bg-white hover:border-purple-300"
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{svc.name}</p>
                    <p className="text-xs text-gray-400">{svc.duration} min · {svc.category}</p>
                  </div>
                  <span className="text-sm font-bold text-purple-700">₦{svc.price.toLocaleString()}</span>
                </button>
              );
            })}
          </section>
        )}

        {/* STEP 2: Date & Time */}
        {step === 2 && (
          <section aria-label="Choose a time" className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-gray-700">Pick a time</h2>
            {slotsLoading ? (
              <p className="text-sm text-gray-500 animate-pulse">Loading availability…</p>
            ) : slotsByDay.length === 0 ? (
              <p className="text-sm text-gray-500">No open slots in the next two weeks. Try another service.</p>
            ) : (
              slotsByDay.map(([day, daySlots]) => (
                <div key={day}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{formatDayLabel(daySlots[0].startTime)}</p>
                  <div className="flex flex-wrap gap-2">
                    {daySlots.map((s) => {
                      const selected = slot?.startTime === s.startTime;
                      return (
                        <button
                          key={s.startTime}
                          type="button"
                          onClick={() => {
                            setSlot(s);
                            setError(null);
                          }}
                          className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                            selected ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-700 border-gray-200 hover:border-purple-300"
                          }`}
                        >
                          {formatTimeLabel(s.startTime)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </section>
        )}

        {/* STEP 3: Confirm */}
        {step === 3 && service && slot && (
          <section aria-label="Confirm booking" className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-gray-700">Confirm your booking</h2>
            <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
              {[
                { label: "Stylist", value: stylist.user.name },
                { label: "Service", value: service.name },
                { label: "When", value: `${formatDayLabel(slot.startTime)}, ${formatTimeLabel(slot.startTime)}` },
                { label: "Duration", value: `${service.duration} min` },
                { label: "Location", value: stylist.location },
                { label: "Price", value: `₦${service.price.toLocaleString()}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="text-sm font-semibold text-gray-900">{value}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="booking-notes" className="text-sm font-medium text-gray-700">Notes for the stylist (optional)</label>
              <textarea
                id="booking-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Anything they should know — inspiration, hair length, allergies…"
                className="px-4 py-3 rounded-lg border border-gray-300 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
              />
            </div>
            <p className="text-xs text-gray-400">
              You&apos;ll confirm and pay on the next screen. The slot is held while payment is pending.
            </p>
          </section>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-3 mt-8">
          {step > 1 && (
            <button type="button" onClick={goBack} className="flex-1 py-3 border border-gray-300 hover:border-purple-400 text-gray-700 font-semibold rounded-lg transition-all text-sm">
              ← Back
            </button>
          )}
          {step < STEPS.length ? (
            <button type="button" onClick={goNext} className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all text-sm shadow-md">
              Continue →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 text-sm shadow-md"
            >
              {submitting && <SpinnerIcon />}
              {submitting ? "Creating booking…" : "Confirm & continue to payment"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function BookAppointmentInner() {
  const params = useSearchParams();
  const stylistId = params.get("stylistId");
  const serviceId = params.get("serviceId");

  if (!stylistId) return <StylistPicker />;
  return <BookFlow stylistId={stylistId} initialServiceId={serviceId} />;
}

export default function BookAppointmentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 py-20 text-center text-purple-600 animate-pulse">Loading…</div>}>
      <BookAppointmentInner />
    </Suspense>
  );
}
