"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ReviewDTO, StylistDetail, StylistServiceSummary } from "@glamly/shared";
import { useStylist, useStylistReviews } from "@/hooks/useStylists";
import { useFavorites } from "@/hooks/useFavorites";

// ── Helpers ───────────────────────────────────────────────────────────────────

function StarRating({ rating, max = 5, size = "sm" }: { rating: number; max?: number; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "w-5 h-5" : size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of ${max} stars`}>
      {Array.from({ length: max }).map((_, i) => (
        <svg key={i} className={`${sz} ${i < Math.round(rating) ? "text-yellow-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z" />
        </svg>
      ))}
    </div>
  );
}

function StatCard({ label, value, icon, accent }: { label: string; value: string | number; icon: string; accent?: string }) {
  const accentMap: Record<string, string> = {
    purple: "bg-purple-50 border-purple-100 text-purple-700",
    yellow: "bg-yellow-50 border-yellow-100 text-yellow-700",
    green: "bg-green-50 border-green-100 text-green-700",
    blue: "bg-blue-50 border-blue-100 text-blue-700",
  };
  return (
    <div className={`flex flex-col items-center p-4 rounded-2xl border text-center ${accent ? accentMap[accent] : "bg-gray-50 border-gray-100 text-gray-700"}`}>
      <span className="text-2xl mb-1.5" aria-hidden="true">{icon}</span>
      <span className="text-xl font-extrabold">{value}</span>
      <span className="text-xs font-medium opacity-70 mt-0.5">{label}</span>
    </div>
  );
}

function formatReviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });
}

function ReviewCard({ review }: { review: ReviewDTO }) {
  return (
    <article className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-linear-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-sm font-bold shrink-0" aria-hidden="true">
            {review.user.name[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{review.user.name}</p>
            <p className="text-xs text-gray-400">
              <time dateTime={review.createdAt}>{formatReviewDate(review.createdAt)}</time>
            </p>
          </div>
        </div>
        <StarRating rating={review.rating} size="sm" />
      </div>
      {review.comment && <p className="text-sm text-gray-600 leading-relaxed">&ldquo;{review.comment}&rdquo;</p>}
    </article>
  );
}

function ServiceItem({ service }: { service: StylistServiceSummary }) {
  const icons: Record<string, string> = {
    Hair: "💇‍♀️",
    Makeup: "💄",
    Nail: "💅",
    Barber: "✂️",
    Braid: "🪢",
    Lash: "👁️",
    Skin: "✨",
    Wax: "🌸",
  };
  const icon = Object.entries(icons).find(([k]) => service.name.includes(k) || service.category.includes(k))?.[1] ?? "✨";
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/40 transition-all duration-200 group">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-white border border-gray-100 group-hover:border-purple-200 flex items-center justify-center text-lg shadow-sm shrink-0" aria-hidden="true">
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{service.name}</p>
          <p className="text-xs text-gray-400">{service.duration} min · {service.category}</p>
        </div>
      </div>
      <span className="text-sm font-bold text-purple-700">from ₦{service.price.toLocaleString()}</span>
    </div>
  );
}

function PackageItem({ pkg }: { pkg: import("@glamly/shared").PackageDTO }) {
  return (
    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/40 transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-bold text-gray-900">{pkg.name}</p>
            <span className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full font-semibold shrink-0">
              Package
            </span>
          </div>
          {pkg.description && (
            <p className="text-xs text-gray-500 mb-2">{pkg.description}</p>
          )}
          <div className="flex flex-wrap gap-1">
            {pkg.services.map((s) => (
              <span key={s.id} className="text-xs bg-white text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full">
                {s.name}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">{pkg.duration} min total</p>
        </div>
        <span className="text-base font-extrabold text-purple-700 shrink-0">₦{pkg.price.toLocaleString()}</span>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <main className="min-h-screen bg-gray-50" aria-busy="true" aria-label="Loading stylist profile">
      <div className="h-72 sm:h-96 bg-gray-200 animate-pulse" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-20 pb-32">
        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row gap-6 mb-8">
            <div className="w-28 h-28 rounded-2xl bg-gray-200 animate-pulse shrink-0 -mt-14 ring-4 ring-white" />
            <div className="flex-1 space-y-3 pt-2">
              <div className="h-7 w-52 bg-gray-200 animate-pulse rounded-lg" />
              <div className="h-4 w-36 bg-gray-200 animate-pulse rounded" />
              <div className="h-4 w-64 bg-gray-200 animate-pulse rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function PortfolioGallery({ stylist }: { stylist: StylistDetail }) {
  const photos = stylist.portfolioUrls;
  if (photos.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-gray-400">
        {stylist.user.name.split(" ")[0]} hasn&apos;t added portfolio photos yet.
      </div>
    );
  }
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-gray-900">Portfolio</h2>
        <span className="text-xs text-gray-400 font-medium">{photos.length} photos</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl overflow-hidden">
        {photos.map((src, i) => (
          <div key={`${src}-${i}`} className="relative aspect-square bg-gray-100 overflow-hidden group cursor-pointer">
            <Image src={src} alt={`Portfolio photo ${i + 1} by ${stylist.user.name}`} fill sizes="(max-width: 768px) 33vw, 15vw" className="object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StylistDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [imgError, setImgError] = useState(false);
  const [activeTab, setActiveTab] = useState<"about" | "services" | "portfolio" | "reviews">("about");
  const [copied, setCopied] = useState(false);

  const { stylist, isLoading, isError } = useStylist(id);
  const { reviews } = useStylistReviews(id, { limit: 20 });
  const { isFavorited, toggle: toggleFavorite } = useFavorites();

  const favorited = stylist ? isFavorited(stylist.id) : false;

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: stylist?.user.name, url });
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) return <DetailSkeleton />;

  if (isError || !stylist) {
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
          <Link href="/stylist" className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors">
            ← Back to all stylists
          </Link>
        </div>
      </main>
    );
  }

  const name = stylist.user.name;
  const cover = !imgError && stylist.avatarUrl ? stylist.avatarUrl : "/images/background/background1.jpg";
  const avgRating = stylist.ratingsSummary.average;
  const reviewCount = stylist.ratingsSummary.count;
  const isAvailable = stylist.availability.isAvailable;

  const tabs = [
    { id: "about" as const, label: "About" },
    { id: "services" as const, label: "Services" },
    { id: "portfolio" as const, label: "Portfolio" },
    { id: "reviews" as const, label: `Reviews (${reviewCount})` },
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ── Hero banner ── */}
      <div className="relative h-72 sm:h-96 overflow-hidden bg-linear-to-br from-purple-900 via-purple-800 to-black">
        <Image src={cover} alt={`${name} cover`} fill sizes="100vw" className="object-cover opacity-40" priority onError={() => setImgError(true)} />
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-r from-purple-900/30 to-transparent" />

        {/* Nav row */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 sm:px-6 pt-5 z-10">
          <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition-colors bg-white/10 hover:bg-white/20 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="flex items-center gap-2">
            <button type="button" onClick={handleShare} aria-label="Share profile" className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              {copied ? (
                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              )}
            </button>

            <button type="button" onClick={() => toggleFavorite(stylist.id)} aria-label={favorited ? "Remove from saved" : "Save stylist"} aria-pressed={favorited} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <svg className={`w-4.5 h-4.5 transition-colors ${favorited ? "text-red-400" : "text-white"}`} fill={favorited ? "currentColor" : "none"} stroke="currentColor" strokeWidth={favorited ? 0 : 2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Hero identity */}
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 pb-6 z-10">
          <div className="flex items-end gap-4">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/20 shrink-0">
              {!imgError && stylist.avatarUrl ? (
                <Image src={stylist.avatarUrl} alt={name} fill className="object-cover" sizes="96px" onError={() => setImgError(true)} />
              ) : (
                <div className="w-full h-full bg-linear-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-3xl font-bold" aria-hidden="true">
                  {name[0]}
                </div>
              )}
            </div>
            <div className="pb-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">{name}</h1>
                {isAvailable ? (
                  <span className="inline-flex items-center gap-1 bg-green-500 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" aria-hidden="true" />
                    Available
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-gray-600/80 text-white text-xs font-medium px-2.5 py-0.5 rounded-full backdrop-blur-sm">Busy</span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap text-white/70 text-sm">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {stylist.location}
                </span>
                {stylist.experience != null && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {stylist.experience} yrs experience
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <StarRating rating={avgRating} size="sm" />
                  <span className="font-semibold text-white ml-0.5">{avgRating.toFixed(1)}</span>
                  <span className="text-white/50">({reviewCount})</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main card ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-32 relative z-10">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
          {/* Tags */}
          <div className="px-6 sm:px-8 pt-5 pb-1">
            <div className="flex flex-wrap gap-2" aria-label="Specialty and tags">
              <span className="text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100 px-3 py-1.5 rounded-full">{stylist.specialty}</span>
              {stylist.tags.map((tag) => (
                <span key={tag} className="text-xs font-medium bg-gray-50 text-gray-500 border border-gray-100 px-3 py-1.5 rounded-full">#{tag}</span>
              ))}
            </div>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 sm:px-8 py-5">
            <StatCard icon="⭐" value={avgRating.toFixed(1)} label="Rating" accent="yellow" />
            <StatCard icon="📝" value={reviewCount} label="Reviews" accent="purple" />
            <StatCard icon="🎓" value={stylist.experience != null ? `${stylist.experience}y` : "—"} label="Experience" accent="blue" />
            <StatCard icon="💰" value={`₦${stylist.priceFrom.toLocaleString()}`} label="From" accent="green" />
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-100 px-6 sm:px-8" role="tablist" aria-label="Stylist profile sections">
            <div className="flex gap-1 overflow-x-auto scrollbar-none -mb-px">
              {tabs.map(({ id: tabId, label }) => (
                <button
                  key={tabId}
                  type="button"
                  role="tab"
                  id={`tab-${tabId}`}
                  aria-selected={activeTab === tabId}
                  aria-controls={`tabpanel-${tabId}`}
                  onClick={() => setActiveTab(tabId)}
                  className={`shrink-0 pb-3.5 pt-1 px-3 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded-t whitespace-nowrap ${
                    activeTab === tabId ? "border-purple-600 text-purple-700" : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Tab panels ── */}
          <div className="p-6 sm:p-8">
            {/* About */}
            {activeTab === "about" && (
              <div id="tabpanel-about" role="tabpanel" aria-labelledby="tab-about">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">About</h2>
                <p className="text-sm text-gray-600 leading-7 mb-6">
                  {stylist.bio ||
                    `${name} is a beauty professional based in ${stylist.location}, specialising in ${stylist.specialty}.`}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Location", value: stylist.location, icon: "📍" },
                    { label: "Specialty", value: stylist.specialty, icon: "💫" },
                    { label: "Experience", value: stylist.experience != null ? `${stylist.experience} years` : "—", icon: "🎓" },
                    { label: "Services", value: `${stylist.services.length} offered`, icon: "🧰" },
                    { label: "Availability", value: isAvailable ? "Open now" : "Busy", icon: "🟢" },
                    { label: "From", value: `₦${stylist.priceFrom.toLocaleString()}`, icon: "💰" },
                  ].map(({ label, value, icon }) => (
                    <div key={label} className="flex items-start gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-lg mt-0.5 shrink-0" aria-hidden="true">{icon}</span>
                      <div>
                        <dt className="text-xs text-gray-400 font-medium">{label}</dt>
                        <dd className="text-sm text-gray-900 font-semibold mt-0.5">{value}</dd>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Services */}
            {activeTab === "services" && (
              <div id="tabpanel-services" role="tabpanel" aria-labelledby="tab-services">
                <p className="text-sm text-gray-500 mb-4">
                  All prices are starting rates. Final price may vary based on complexity and products used.
                </p>
                {stylist.services.length > 0 ? (
                  <div className="flex flex-col gap-2 mb-6">
                    {stylist.services.map((svc) => (
                      <ServiceItem key={svc.id} service={svc} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 py-6 text-center">No services listed yet.</p>
                )}

                {/* Packages section */}
                {stylist.packages.filter((p) => p.isActive).length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Packages</h3>
                      <span className="text-xs text-gray-400">— bundled services at a special rate</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {stylist.packages.filter((p) => p.isActive).map((pkg) => (
                        <PackageItem key={pkg.id} pkg={pkg} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Portfolio */}
            {activeTab === "portfolio" && (
              <div id="tabpanel-portfolio" role="tabpanel" aria-labelledby="tab-portfolio">
                <PortfolioGallery stylist={stylist} />
              </div>
            )}

            {/* Reviews */}
            {activeTab === "reviews" && (
              <div id="tabpanel-reviews" role="tabpanel" aria-labelledby="tab-reviews">
                <div className="flex items-center gap-5 p-5 bg-linear-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-100 mb-6">
                  <div className="text-center shrink-0">
                    <div className="text-5xl font-extrabold text-purple-700 leading-none" aria-label={`${avgRating} average rating`}>
                      {avgRating.toFixed(1)}
                    </div>
                    <StarRating rating={avgRating} size="md" />
                    <p className="text-xs text-gray-500 mt-1">{reviewCount} reviews</p>
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5" aria-label="Rating distribution">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const pct =
                        star >= Math.floor(avgRating)
                          ? Math.min(100, 70 + (star - Math.floor(avgRating)) * 10)
                          : Math.max(4, 30 - (Math.floor(avgRating) - star) * 20);
                      return (
                        <div key={star} className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-3 shrink-0" aria-hidden="true">{star}</span>
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden" role="progressbar" aria-label={`${star} star: ${pct}%`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                            <div className="h-full bg-yellow-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-400 w-8 text-right shrink-0">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {reviews.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {reviews.map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-12 text-center">
                    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-gray-500 mb-1">No reviews yet</p>
                    <p className="text-xs text-gray-400">Be the first to book and leave a review!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sticky booking footer ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-2xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-400">Starting from</p>
            <p className="text-xl font-extrabold text-purple-700">₦{stylist.priceFrom.toLocaleString()}</p>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-sm justify-end">
            <Link href="/gift-service" className="px-4 py-2.5 text-xs font-semibold text-purple-700 border border-purple-200 rounded-xl hover:bg-purple-50 transition-colors whitespace-nowrap">
              Gift this
            </Link>

            {isAvailable ? (
              <Link
                href={`/book-appointment?stylistId=${stylist.id}`}
                className="flex-1 py-2.5 text-sm font-bold text-center rounded-xl shadow-lg bg-purple-600 hover:bg-purple-700 text-white hover:shadow-purple-200 hover:-translate-y-0.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
              >
                Book Appointment
              </Link>
            ) : (
              <button type="button" disabled className="flex-1 py-2.5 text-sm font-bold text-center rounded-xl bg-gray-200 text-gray-400 cursor-not-allowed" aria-label="This stylist is currently unavailable for booking">
                Currently Unavailable
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
