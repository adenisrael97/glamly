"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useStylist } from "@/hooks/useStylists";
import { useFavorites } from "@/hooks/useFavorites";

// ── Helpers ───────────────────────────────────────────────────────────────────

function StarRating({ rating, max = 5, size = "sm" }) {
  const sz = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: max }).map((_, i) => (
        <svg
          key={i}
          className={`${sz} ${i < Math.round(rating) ? "text-yellow-400" : "text-gray-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z" />
        </svg>
      ))}
    </div>
  );
}

function StatPill({ label, value, icon }) {
  return (
    <div className="flex flex-col items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
      <span className="text-2xl mb-1" aria-hidden="true">{icon}</span>
      <span className="text-lg font-extrabold text-gray-900">{value}</span>
      <span className="text-xs text-gray-500 mt-0.5">{label}</span>
    </div>
  );
}

function ReviewCard({ review }) {
  return (
    <article className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full bg-linear-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-sm font-bold shrink-0"
            aria-hidden="true"
          >
            {review.author[0]}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{review.author}</p>
            <p className="text-xs text-gray-400">
              <time>{review.date}</time>
            </p>
          </div>
        </div>
        <StarRating rating={review.rating} size="sm" />
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">&ldquo;{review.text}&rdquo;</p>
    </article>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <main className="min-h-screen bg-gray-50" aria-busy="true" aria-label="Loading stylist profile">
      <div className="h-72 bg-gray-200 animate-pulse" />
      <div className="max-w-5xl mx-auto px-4 -mt-16 pb-16">
        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row gap-6 mb-8">
            <div className="w-28 h-28 rounded-2xl bg-gray-200 animate-pulse shrink-0" />
            <div className="flex-1 space-y-3 pt-2">
              <div className="h-6 w-48 bg-gray-200 animate-pulse rounded" />
              <div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />
              <div className="h-4 w-64 bg-gray-200 animate-pulse rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-xl" />
            ))}
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 animate-pulse rounded w-full" />
            <div className="h-4 bg-gray-200 animate-pulse rounded w-5/6" />
            <div className="h-4 bg-gray-200 animate-pulse rounded w-4/6" />
          </div>
        </div>
      </div>
    </main>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StylistDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [imgError, setImgError] = useState(false);
  const [activeTab, setActiveTab] = useState("about");

  const { stylist, isLoading, isError } = useStylist(id);
  const { isFavorited, toggle: toggleFavorite } = useFavorites();

  const favorited = stylist ? isFavorited(stylist.id) : false;

  if (isLoading) return <DetailSkeleton />;

  if (isError || (!isLoading && !stylist)) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div role="alert" className="text-center px-4">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">Stylist not found</h1>
          <p className="text-sm text-gray-500 mb-6">This profile may have been removed or the link is incorrect.</p>
          <Link
            href="/stylist"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            ← Back to all stylists
          </Link>
        </div>
      </main>
    );
  }

  const reviews = stylist.reviews ?? [];
  const serviceIcon = (svc) => {
    if (svc.includes("Hair")) return "💇‍♀️";
    if (svc.includes("Makeup")) return "💄";
    if (svc.includes("Nail")) return "💅";
    if (svc.includes("Barber")) return "✂️";
    if (svc.includes("Braid")) return "🪢";
    return "✨";
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ── Hero banner ── */}
      <div className="relative h-60 sm:h-72 overflow-hidden bg-linear-to-br from-purple-900 via-purple-800 to-black">
        <Image
          src="/images/background/background1.jpg"
          alt=""
          fill
          className="object-cover opacity-30"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />

        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10">
          <Link
            href="/stylist"
            className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            All Stylists
          </Link>
        </div>
      </div>

      {/* ── Main card ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-20 pb-28 relative z-10">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">

          {/* ── Profile header ── */}
          <div className="p-6 sm:p-8 pb-0">
            <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-start">
              {/* Avatar */}
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shadow-xl shrink-0 -mt-12 sm:-mt-16 ring-4 ring-white">
                {!imgError ? (
                  <Image
                    src={stylist.image}
                    alt={stylist.name}
                    fill
                    className="object-cover"
                    sizes="112px"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-linear-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-3xl font-bold" aria-hidden="true">
                    {stylist.name[0]}
                  </div>
                )}
              </div>

              {/* Name block */}
              <div className="flex-1 min-w-0 sm:pt-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">{stylist.name}</h1>
                      {stylist.available ? (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-green-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" aria-hidden="true" />
                          Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-xs font-medium px-2.5 py-0.5 rounded-full">
                          Busy
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {stylist.location}, Lagos
                      </span>
                      <span>{stylist.experience} yrs experience</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <StarRating rating={stylist.rating} size="sm" />
                      <span className="text-sm font-semibold text-gray-900">{stylist.rating}</span>
                      <span className="text-xs text-gray-400">({stylist.reviewCount} reviews)</span>
                    </div>
                  </div>

                  {/* Favorite button */}
                  <button
                    type="button"
                    onClick={() => toggleFavorite(stylist.id)}
                    aria-label={favorited ? "Remove from saved stylists" : "Save stylist"}
                    aria-pressed={favorited}
                    className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:border-red-300 hover:bg-red-50 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                  >
                    <svg
                      className={`w-5 h-5 transition-colors ${favorited ? "text-red-500" : "text-gray-400"}`}
                      fill={favorited ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth={favorited ? 0 : 2}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Service tags */}
            <div className="flex flex-wrap gap-2 mt-5" aria-label="Services offered">
              {stylist.services.map((svc) => (
                <span key={svc} className="text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100 px-3 py-1.5 rounded-full">
                  {svc}
                </span>
              ))}
              {stylist.tags?.map((tag) => (
                <span key={tag} className="text-xs font-medium bg-gray-50 text-gray-600 border border-gray-100 px-3 py-1.5 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>

            {/* Tabs */}
            <div
              className="flex gap-6 mt-6 border-b border-gray-100"
              role="tablist"
              aria-label="Stylist profile sections"
            >
              {["about", "reviews"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  id={`tab-${tab}`}
                  aria-selected={activeTab === tab}
                  aria-controls={`tabpanel-${tab}`}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded-t ${
                    activeTab === tab
                      ? "border-purple-600 text-purple-700"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {tab === "reviews" ? `Reviews (${reviews.length})` : tab}
                </button>
              ))}
            </div>
          </div>

          {/* ── Tab panels ── */}
          <div className="p-6 sm:p-8 pt-6">

            {/* About tab */}
            <div
              id="tabpanel-about"
              role="tabpanel"
              aria-labelledby="tab-about"
              hidden={activeTab !== "about"}
            >
              {activeTab === "about" && (
                <div className="animate-fade-in">
                  {/* Stats grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                    <StatPill icon="⭐" value={stylist.rating} label="Rating" />
                    <StatPill icon="📅" value={stylist.completedBookings} label="Bookings" />
                    <StatPill icon="⚡" value={stylist.responseTime} label="Response" />
                    <StatPill icon="🔁" value={`${65 + (stylist.id % 30)}%`} label="Repeat clients" />
                  </div>

                  {/* Bio */}
                  <div className="mb-8">
                    <h2 className="text-base font-bold text-gray-900 mb-3">About</h2>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {stylist.bio || (
                        <>
                          {stylist.name} is a highly skilled beauty professional based in {stylist.location}, Lagos.
                          With {stylist.experience} years of experience, they specialise in{" "}
                          <strong>{stylist.services.join(", ")}</strong> and have built a loyal clientele through
                          dedication to quality and client satisfaction.
                        </>
                      )}
                    </p>
                  </div>

                  {/* Services offered */}
                  <div className="mb-8">
                    <h2 className="text-base font-bold text-gray-900 mb-3">Services Offered</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {stylist.services.map((svc) => (
                        <div key={svc} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-base shrink-0" aria-hidden="true">
                            {serviceIcon(svc)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{svc}</p>
                            <p className="text-xs text-gray-400">Starting from ₦{stylist.price.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick facts */}
                  <div>
                    <h2 className="text-base font-bold text-gray-900 mb-3">Quick Info</h2>
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      {[
                        { label: "Location", value: stylist.location },
                        { label: "Experience", value: `${stylist.experience} years` },
                        { label: "Response time", value: stylist.responseTime },
                        { label: "Languages", value: stylist.experience >= 5 ? "English, Yoruba" : "English" },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex flex-col gap-0.5">
                          <dt className="text-xs text-gray-400 font-medium">{label}</dt>
                          <dd className="text-gray-900 font-semibold">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              )}
            </div>

            {/* Reviews tab */}
            <div
              id="tabpanel-reviews"
              role="tabpanel"
              aria-labelledby="tab-reviews"
              hidden={activeTab !== "reviews"}
            >
              {activeTab === "reviews" && (
                <div className="animate-fade-in space-y-4">
                  {/* Rating summary */}
                  <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-2xl border border-purple-100 mb-6">
                    <div className="text-center">
                      <div className="text-4xl font-extrabold text-purple-700" aria-label={`${stylist.rating} average rating`}>
                        {stylist.rating}
                      </div>
                      <StarRating rating={stylist.rating} size="md" />
                      <p className="text-xs text-gray-500 mt-1">{stylist.reviewCount} reviews</p>
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5" aria-label="Rating distribution">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const pct = star >= Math.floor(stylist.rating)
                          ? 70 + (star - Math.floor(stylist.rating)) * 10
                          : Math.max(5, 30 - (Math.floor(stylist.rating) - star) * 20);
                        return (
                          <div key={star} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-3" aria-hidden="true">{star}</span>
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden" role="progressbar" aria-label={`${star} star: ${Math.min(100, pct)}%`} aria-valuenow={Math.min(100, pct)} aria-valuemin={0} aria-valuemax={100}>
                              <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {reviews.length > 0
                    ? reviews.map((review) => <ReviewCard key={review.id} review={review} />)
                    : (
                      <p className="text-sm text-gray-400 text-center py-8">No reviews yet.</p>
                    )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky booking footer ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-2xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-400">Starting from</p>
            <p className="text-xl font-extrabold text-purple-700">₦{stylist.price.toLocaleString()}</p>
          </div>
          {stylist.available ? (
            <Link
              href={`/book-appointment?stylist=${stylist.id}`}
              className="flex-1 max-w-xs py-3 text-sm font-bold text-center rounded-xl shadow-lg bg-purple-600 hover:bg-purple-700 text-white hover:shadow-purple-200 hover:-translate-y-0.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
            >
              Book Appointment
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="flex-1 max-w-xs py-3 text-sm font-bold text-center rounded-xl bg-gray-200 text-gray-400 cursor-not-allowed"
              aria-label="This stylist is currently unavailable for booking"
            >
              Currently Unavailable
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
