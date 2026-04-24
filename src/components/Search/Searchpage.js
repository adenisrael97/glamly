"use client";

import { useState, useMemo, useCallback, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';
import stylists from "@/data/stylist/stylist.json";

// Lazy load components
const StylistCard = lazy(() => import('./StylistCard'));
const SearchFilters = dynamic(() => import('./SearchFilters'), {
  loading: () => <div className="bg-white p-4 rounded-lg shadow mb-6 animate-pulse h-16"></div>
});

// Loading component for stylist cards
const StylistCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md p-4 animate-pulse">
    <div className="bg-gray-300 h-48 rounded-lg mb-4"></div>
    <div className="bg-gray-300 h-4 rounded mb-2"></div>
    <div className="bg-gray-300 h-3 rounded mb-2 w-3/4"></div>
    <div className="bg-gray-300 h-3 rounded mb-4 w-1/2"></div>
    <div className="flex justify-between mb-4">
      <div className="bg-gray-300 h-4 rounded w-16"></div>
      <div className="bg-gray-300 h-4 rounded w-12"></div>
    </div>
    <div className="bg-gray-300 h-8 rounded"></div>
  </div>
);

export default function SearchPage() {
  const router = useRouter();

  // --------------------- State ---------------------
  const [locationQuery, setLocationQuery] = useState("");
  const [sortBy, setSortBy] = useState(""); 
  const [minRating, setMinRating] = useState(0);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000000 });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // --------------------- Filter + Sort ---------------------
  const filteredStylists = useMemo(() => {
    let result = stylists.filter(
      (s) =>
        s.available &&
        s.location.toLowerCase().includes(locationQuery.toLowerCase()) &&
        s.rating >= minRating &&
        s.price >= priceRange.min &&
        s.price <= priceRange.max
    );

    if (sortBy === "price-asc") result.sort((a, b) => a.price - b.price);
    if (sortBy === "price-desc") result.sort((a, b) => b.price - a.price);
    if (sortBy === "rating-desc") result.sort((a, b) => b.rating - a.rating);

    return result;
  }, [locationQuery, minRating, priceRange, sortBy]);

  // --------------------- Pagination ---------------------
  const totalPages = Math.ceil(filteredStylists.length / pageSize);
  const paginatedStylists = useMemo(() => 
    filteredStylists.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    ), [filteredStylists, currentPage, pageSize]);

  // --------------------- Event Handlers ---------------------
  const handleLocationChange = useCallback((value) => {
    setLocationQuery(value);
    setCurrentPage(1);
  }, []);

  const handleFilterChange = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const handleBooking = useCallback((stylistId) => {
    router.push(`/booking/${stylistId}`);
  }, [router]);

  return (
    <section className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        {/* --------------------- Header + Search Input --------------------- */}
        <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">
              Stylists
            </h1>
            <p className="text-gray-600 mt-1">
              {filteredStylists.length} stylist(s) found
            </p>
          </div>

          {/* Search input */}
          <input
            type="text"
            placeholder="Enter location..."
            value={locationQuery}
            onChange={(e) => handleLocationChange(e.target.value)}
            className="px-4 py-2 border rounded-lg w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* --------------------- Filter Bar --------------------- */}
        <SearchFilters
          minRating={minRating}
          setMinRating={setMinRating}
          priceRange={priceRange}
          setPriceRange={setPriceRange}
          sortBy={sortBy}
          setSortBy={setSortBy}
          onFilterChange={handleFilterChange}
        />

        {/* --------------------- Stylists Grid --------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Suspense fallback={
            Array(pageSize).fill(0).map((_, i) => <StylistCardSkeleton key={i} />)
          }>
            {paginatedStylists.map((stylist) => (
              <StylistCard 
                key={stylist.id} 
                stylist={stylist}
                onBook={handleBooking}
              />
            ))}
          </Suspense>
        </div>

        {/* --------------------- Pagination --------------------- */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 border rounded ${
                    currentPage === page 
                      ? 'bg-purple-600 text-white border-purple-600' 
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}

        {/* No results message */}
        {filteredStylists.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No stylists found matching your criteria.</p>
            <button
              onClick={() => {
                setLocationQuery("");
                setMinRating(0);
                setPriceRange({ min: 0, max: 1000000 });
                setSortBy("");
              }}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
