"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useDebounce } from "@/hooks/useDebounce";
import { useFavorites } from "@/hooks/useFavorites";
import { useStylists } from "@/hooks/useStylists";
import { StylistCardSkeleton } from "@/components/ui/Skeleton";

const StylistCard = dynamic(() => import("./StylistCard"), {
  loading: () => <StylistCardSkeleton />,
  ssr: false,
});

const SearchFilters = dynamic(() => import("./SearchFilters"), {
  loading: () => <div className="h-14 bg-white rounded-2xl border border-gray-100 shadow-sm animate-pulse mb-6" />,
  ssr: false,
});

const SERVICE_CHIPS = ["All", "Hair Styling", "Makeup", "Nails", "Braiding", "Barber"];
const PAGE_SIZE = 6;

export default function SearchPage() {
  const router      = useRouter();
  const searchParams = useSearchParams();

  // ── Filter state ───────────────────────────────────────────
  const [query,          setQuery]          = useState(searchParams.get("service") ?? "");
  const [locationQuery,  setLocationQuery]  = useState(searchParams.get("location") ?? "");
  const [activeService,  setActiveService]  = useState("All");
  const [sortBy,         setSortBy]         = useState("");
  const [minRating,      setMinRating]      = useState(0);
  const [priceRange,     setPriceRange]     = useState({ min: 0, max: 999999 });
  const [showUnavailable,setShowUnavailable]= useState(false);
  const [currentPage,    setCurrentPage]    = useState(1);

  const debouncedQuery    = useDebounce(query);
  const debouncedLocation = useDebounce(locationQuery);

  // ── SWR data fetch ─────────────────────────────────────────
  const { stylists, meta, isLoading, isError } = useStylists({
    query:         debouncedQuery    || undefined,
    location:      debouncedLocation || undefined,
    service:       activeService !== "All" ? activeService : undefined,
    minRating:     minRating     || undefined,
    minPrice:      priceRange.min || undefined,
    maxPrice:      priceRange.max < 999999 ? priceRange.max : undefined,
    availableOnly: !showUnavailable,
    sortBy:        sortBy        || undefined,
    page:          currentPage,
    pageSize:      PAGE_SIZE,
  });

  // ── Favorites (extracted hook) ─────────────────────────────
  const { favorites, isFavorited, toggle: toggleFavorite, count: favCount } = useFavorites();

  const inputRef = useRef(null);

  // Focus search input when arriving from hero
  useEffect(() => {
    if (searchParams.get("service") && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchParams]);

  // Reset to page 1 whenever any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery, debouncedLocation, activeService, minRating, priceRange, sortBy, showUnavailable]);

  // ── Handlers ───────────────────────────────────────────────
  const handleToggleFavorite = useCallback((id) => toggleFavorite(id), [toggleFavorite]);

  const handleBook = useCallback((id) => {
    router.push(`/booking/${id}`);
  }, [router]);

  const clearFilters = useCallback(() => {
    setQuery("");
    setLocationQuery("");
    setActiveService("All");
    setMinRating(0);
    setPriceRange({ min: 0, max: 999999 });
    setSortBy("");
    setShowUnavailable(false);
  }, []);

  const hasActiveFilters =
    query || locationQuery || activeService !== "All" || minRating > 0 ||
    priceRange.min > 0 || priceRange.max < 999999 || sortBy || showUnavailable;

  // Build skeleton array once
  const skeletons = useMemo(() => Array.from({ length: PAGE_SIZE }), []);

  return (
    <section className="min-h-screen bg-gray-50">

      {/* ── Sticky search / filter header ── */}
      <div
        className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm"
        role="search"
        aria-label="Search stylists"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">

            {/* Name / service search */}
            <div className="relative flex-1 max-w-xl">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                id="stylist-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, service, or style…"
                aria-label="Search stylists by name, service, or style"
                aria-controls="stylist-grid"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Location */}
            <div className="relative w-full sm:w-48">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <input
                type="text"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="Location"
                aria-label="Filter by location"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
              />
            </div>

            {/* Result count + saved count */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              {/* aria-live so screen readers announce count changes */}
              <span
                aria-live="polite"
                aria-atomic="true"
                className="text-sm text-gray-500"
              >
                <span className="font-semibold text-gray-900">{meta.total}</span> stylists
              </span>
              {favCount > 0 && (
                <span className="flex items-center gap-1 text-xs bg-red-50 text-red-500 border border-red-100 px-2 py-1 rounded-full font-medium">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span aria-label={`${favCount} saved stylists`}>{favCount} saved</span>
                </span>
              )}
            </div>
          </div>

          {/* Service chips */}
          <div
            className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none"
            role="group"
            aria-label="Filter by service type"
          >
            {SERVICE_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setActiveService(chip)}
                aria-pressed={activeService === chip}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border ${
                  activeService === chip
                    ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-700"
                }`}
              >
                {chip}
              </button>
            ))}

            <label className="shrink-0 flex items-center gap-1.5 cursor-pointer ml-auto">
              <input
                type="checkbox"
                checked={showUnavailable}
                onChange={(e) => setShowUnavailable(e.target.checked)}
                className="w-3.5 h-3.5 accent-purple-600"
              />
              <span className="text-xs text-gray-500 whitespace-nowrap">Show busy</span>
            </label>
          </div>
        </div>
      </div>

      {/* ── Page body ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* Advanced filters */}
        <SearchFilters
          minRating={minRating}
          setMinRating={setMinRating}
          priceRange={priceRange}
          setPriceRange={setPriceRange}
          sortBy={sortBy}
          setSortBy={setSortBy}
          onFilterChange={() => setCurrentPage(1)}
        />

        {/* Active filter status bar */}
        {hasActiveFilters && !isLoading && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500" aria-live="polite">
              Showing{" "}
              <span className="font-semibold text-gray-900">{meta.total}</span>{" "}
              result{meta.total !== 1 ? "s" : ""}
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-purple-600 hover:text-purple-800 font-medium transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear all filters
            </button>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div
            role="alert"
            className="flex flex-col items-center py-16 text-center animate-fade-in"
          >
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-800 mb-1">Something went wrong</h3>
            <p className="text-sm text-gray-500">Failed to load stylists. Please try again.</p>
          </div>
        )}

        {/* Grid — skeletons while loading, cards when ready */}
        {!isError && (
          <div
            id="stylist-grid"
            aria-label="Stylist results"
            aria-busy={isLoading}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8 animate-fade-in"
          >
            {isLoading
              ? skeletons.map((_, i) => <StylistCardSkeleton key={i} />)
              : stylists.map((stylist) => (
                  <StylistCard
                    key={stylist.id}
                    stylist={stylist}
                    onBook={handleBook}
                    isFavorited={isFavorited(stylist.id)}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && stylists.length === 0 && (
          <div className="flex flex-col items-center py-20 text-center animate-fade-in" role="status">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-5">
              <svg className="w-9 h-9 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No stylists found</h3>
            <p className="text-sm text-gray-500 max-w-xs mb-6">
              Try adjusting your search or filters, or enable &ldquo;Show busy&rdquo; to see more stylists.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && meta.totalPages > 1 && (
          <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5 mt-4">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>

            {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setCurrentPage(p)}
                aria-label={`Page ${p}`}
                aria-current={p === currentPage ? "page" : undefined}
                className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                  p === currentPage
                    ? "bg-purple-600 text-white shadow-sm"
                    : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, meta.totalPages))}
              disabled={currentPage === meta.totalPages}
              aria-label="Next page"
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </nav>
        )}
      </div>
    </section>
  );
}
