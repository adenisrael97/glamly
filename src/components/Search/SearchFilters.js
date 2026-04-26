"use client";

import { memo, useState } from "react";

const RATING_OPTIONS = [
  { value: 0, label: "Any rating" },
  { value: 4, label: "4★+" },
  { value: 4.5, label: "4.5★+" },
  { value: 5, label: "5★ only" },
];

const SORT_OPTIONS = [
  { value: "", label: "Recommended" },
  { value: "rating-desc", label: "Top rated" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "experience", label: "Most experienced" },
];

const PRICE_PRESETS = [
  { label: "Any", min: 0, max: 999999 },
  { label: "Under ₦5k", min: 0, max: 5000 },
  { label: "₦5k–₦8k", min: 5000, max: 8000 },
  { label: "₦8k–₦12k", min: 8000, max: 12000 },
  { label: "₦12k+", min: 12000, max: 999999 },
];

const SearchFilters = memo(({
  minRating,
  setMinRating,
  priceRange,
  setPriceRange,
  sortBy,
  setSortBy,
  onFilterChange,
}) => {
  const [expanded, setExpanded] = useState(false);

  const activePricePreset = PRICE_PRESETS.find(
    (p) => p.min === priceRange.min && p.max === priceRange.max
  );

  const activeCount = [
    minRating > 0,
    priceRange.min > 0 || priceRange.max < 999999,
    !!sortBy,
  ].filter(Boolean).length;

  return (
    <div className="mb-5">
      {/* Toggle bar */}
      <div className="flex items-center gap-3 mb-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-purple-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
          {activeCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
          <svg className={`w-4 h-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Quick sort pills always visible */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {SORT_OPTIONS.slice(0, 3).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setSortBy(opt.value); onFilterChange?.(); }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                sortBy === opt.value
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 grid grid-cols-1 sm:grid-cols-3 gap-6 animate-fade-in">
          {/* Rating */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">Min Rating</p>
            <div className="flex flex-wrap gap-2">
              {RATING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setMinRating(opt.value); onFilterChange?.(); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                    minRating === opt.value
                      ? "bg-yellow-400 text-black border-yellow-400 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-yellow-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price presets */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">Price Range</p>
            <div className="flex flex-wrap gap-2">
              {PRICE_PRESETS.map((preset) => {
                const active = activePricePreset?.label === preset.label;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => { setPriceRange({ min: preset.min, max: preset.max }); onFilterChange?.(); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                      active
                        ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                        : "bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-700"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort (full list) */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">Sort By</p>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setSortBy(opt.value); onFilterChange?.(); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                    sortBy === opt.value
                      ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

SearchFilters.displayName = "SearchFilters";

export default SearchFilters;
