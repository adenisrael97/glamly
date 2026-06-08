"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { BookingStatus } from "@glamly/shared";
import { ApiError, paymentsApi, bookingsApi, reviewsApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useBooking } from "@/hooks/useBookings";
import { useRealtime } from "@/hooks/useRealtime";

const STATUS_STYLES: Record<BookingStatus, { label: string; cls: string }> = {
  PENDING: { label: "Awaiting payment", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  CONFIRMED: { label: "Confirmed", cls: "bg-green-50 text-green-700 border-green-200" },
  CANCELLED: { label: "Cancelled", cls: "bg-red-50 text-red-700 border-red-200" },
  COMPLETED: { label: "Completed", cls: "bg-purple-50 text-purple-700 border-purple-200" },
};

const SpinnerIcon = () => (
  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-NG", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ── Review form ─────────────────────────────────────────────────────────────────

function ReviewForm({ bookingId, onDone }: { bookingId: string; onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await reviewsApi.create({ bookingId, rating, comment: comment.trim() || undefined });
      setDone(true);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit your review.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">Thanks for your review! ✨</p>;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <h2 className="text-base font-semibold text-gray-800 mb-3">Leave a review</h2>
      {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-1 mb-3" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setRating(n)}
            className={`text-2xl transition-transform hover:scale-110 ${n <= rating ? "text-yellow-400" : "text-gray-300"}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="How was your appointment?"
        className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none mb-3"
      />
      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg flex items-center gap-2"
      >
        {submitting && <SpinnerIcon />}
        Submit review
      </button>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto animate-pulse">
        <div className="h-4 w-24 bg-gray-200 rounded mb-6" />
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-purple-200 h-24 w-full" />
          <div className="p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 w-20 bg-gray-100 rounded" />
                <div className="h-4 w-32 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

// ── Page content (requires auth — extracted so Suspense works for useSearchParams) ──

function BookingDetailContent() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const searchParams = useSearchParams();
  const router = useRouter();

  // Destructure status so we can gate the API call until the session is restored.
  // After a cross-site redirect (Paystack callback) the in-memory access token is
  // gone; the AuthContext effect will silently restore it from the refresh cookie.
  // Firing useBooking before that resolves triggers a 401 → the refresh interceptor
  // fires → if the refresh fails for any reason, onSessionExpired clears the role
  // cookie → middleware blocks the next navigation → user lands on Login.
  const { accessToken, status } = useAuth();

  const { booking, isLoading, isError, mutate } = useBooking(
    id,
    // Only fetch once the session is confirmed — avoids the 401 race on
    // page loads that follow a cross-site redirect (e.g. payment callbacks).
    status === "authenticated",
  );

  const [payError, setPayError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Client-side auth guard — fires after render so the skeleton shows immediately.
  // Primary guard is middleware (role cookie). This catches the edge case where the
  // refresh token is genuinely expired after a cross-site redirect, which would
  // leave the user on a broken page. Use replace so Login doesn't stack on the
  // booking URL in history, which would create a back-button redirect loop.
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/Login?next=/booking/${id}`);
    }
  }, [status, id, router]);

  // Live updates: a webhook-confirmed payment flips the booking to CONFIRMED.
  useRealtime(accessToken, {
    onBookingConfirmed: (p) => {
      if (p.bookingId === id) void mutate();
    },
    onBookingCancelled: (p) => {
      if (p.bookingId === id) void mutate();
    },
  });

  // If we returned from the Paystack-hosted checkout (?reference=...), poll the
  // payment status a few times and revalidate the booking once it resolves.
  // Polling runs independently of auth state — the interceptor will refresh the
  // token if needed and the mutate() call is safe even before auth resolves
  // (SWR no-ops on a null key).
  const reference = searchParams.get("reference");
  useEffect(() => {
    if (!reference) return;
    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      try {
        const status = await paymentsApi.getStatus(reference);
        if (cancelled) return;
        if (status.status === "SUCCESS" || status.status === "FAILED") {
          void mutate();
          return;
        }
      } catch {
        // ignore transient errors and keep polling
      }
      if (!cancelled && attempts < 6) setTimeout(poll, 2500);
    };
    void poll();
    return () => {
      cancelled = true;
    };
  }, [reference, mutate]);

  const handlePay = useCallback(async () => {
    setPaying(true);
    setPayError(null);
    try {
      const { authorizationUrl } = await paymentsApi.initiate({ bookingId: id });
      window.location.href = authorizationUrl;
    } catch (err) {
      setPayError(
        err instanceof ApiError ? err.message : "Could not start checkout. Please try again.",
      );
      setPaying(false);
    }
  }, [id]);

  const handleCancel = useCallback(async () => {
    setCancelling(true);
    try {
      await bookingsApi.cancel(id, {});
      await mutate();
    } catch {
      // surfaced by revalidation
    } finally {
      setCancelling(false);
    }
  }, [id, mutate]);

  // Show loading skeleton while the session is being restored from the refresh
  // cookie (the common case after a cross-site redirect like a payment callback).
  if (status === "loading") {
    return <LoadingSkeleton />;
  }

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError || !booking) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-lg font-bold text-gray-900 mb-2">Booking not found</h1>
          <p className="text-sm text-gray-500 mb-6">It may have been removed, or you don&apos;t have access.</p>
          <Link href="/dashboard" className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl">
            Go to my bookings
          </Link>
        </div>
      </main>
    );
  }

  const statusStyle = STATUS_STYLES[booking.status];

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard" className="text-sm text-purple-600 hover:text-purple-800 mb-4 inline-block">
          ← My bookings
        </Link>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-linear-to-r from-purple-900 to-purple-700 text-white p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-extrabold">
                  {booking.service?.name ?? "Multiple services"}
                </h1>
                <p className="text-purple-200 text-sm mt-0.5">with {booking.stylist.user.name}</p>
              </div>
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${statusStyle.cls}`}>
                {statusStyle.label}
              </span>
            </div>
          </div>

          <div className="p-6 divide-y divide-gray-100">
            {[
              { label: "When", value: formatWhen(booking.startTime) },
              { label: "Location", value: booking.stylist.location },
              { label: "Category", value: booking.service?.category ?? "Multiple" },
              { label: "Amount", value: `₦${booking.totalAmount.toLocaleString()}` },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-3">
                <span className="text-sm text-gray-500">{label}</span>
                <span className="text-sm font-semibold text-gray-900">{value}</span>
              </div>
            ))}
            {booking.notes && (
              <div className="py-3">
                <p className="text-sm text-gray-500 mb-1">Your notes</p>
                <p className="text-sm text-gray-800">{booking.notes}</p>
              </div>
            )}
          </div>

          <div className="p-6 pt-0 flex flex-col gap-3">
            {booking.status === "PENDING" && (
              <>
                {payError && <p role="alert" className="text-sm text-red-600">{payError}</p>}
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={paying}
                  className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-black font-bold rounded-xl flex items-center justify-center gap-2 shadow-md"
                >
                  {paying && <SpinnerIcon />}
                  Pay ₦{booking.totalAmount.toLocaleString()}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="w-full py-2.5 text-sm font-semibold text-gray-500 hover:text-red-600 transition-colors"
                >
                  {cancelling ? "Cancelling…" : "Cancel booking"}
                </button>
              </>
            )}

            {booking.status === "CONFIRMED" && (
              <div className="text-center">
                <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                  Your appointment is confirmed. See you soon! 🎉
                </p>
                <Link
                  href="/dashboard"
                  className="mt-3 inline-block px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  View all my bookings
                </Link>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="mt-2 block w-full text-sm font-semibold text-gray-500 hover:text-red-600 transition-colors"
                >
                  {cancelling ? "Cancelling…" : "Cancel booking"}
                </button>
              </div>
            )}

            {booking.status === "CANCELLED" && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  This booking was cancelled{booking.cancellationReason ? `: ${booking.cancellationReason}` : "."}
                </p>
                <Link
                  href="/dashboard"
                  className="text-center px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  View all my bookings
                </Link>
              </div>
            )}

            {booking.status === "COMPLETED" && <ReviewForm bookingId={booking.id} onDone={() => void mutate()} />}
          </div>
        </div>
      </div>
    </main>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────────
//
// Suspense is required here because BookingDetailContent calls useSearchParams().
// Without a boundary Next.js 15 will suspend the entire route during SSR.

export default function BookingDetailPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <BookingDetailContent />
    </Suspense>
  );
}
