"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import servicesData from "../../data/services.json";

const ITEMS_PER_PAGE = 8;
const categories = ["Hair", "Makeup", "Eyes", "Nails"];
const hairGenders = ["Men", "Women"];

export default function Collection() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedHairGender, setSelectedHairGender] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const filteredServices = useMemo(() => {
    return servicesData.filter((service) => {
      if (selectedCategory === "All") return true;
      if (selectedCategory === "Hair") {
        if (selectedHairGender) {
          return service.category === "Hair" && service.gender === selectedHairGender;
        }
        return service.category === "Hair";
      }
      return service.category === selectedCategory;
    });
  }, [selectedCategory, selectedHairGender]);

  const totalPages = Math.ceil(filteredServices.length / ITEMS_PER_PAGE);
  const paginatedServices = filteredServices.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setSelectedHairGender(null);
    setPage(1);
  };

  const handleGenderChange = (gender: string) => {
    setSelectedHairGender(gender === selectedHairGender ? null : gender);
    setPage(1);
  };

  return (
    <section className="py-16 px-4 bg-white/90">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-800 tracking-tight uppercase">
          OUR COLLECTION
        </h2>
        <p className="text-lg md:text-xl text-purple-700 font-semibold mb-2">50+ Services</p>
        <p className="text-base md:text-lg text-gray-600 mb-8">
          Browse our complete collection of hairstyles, makeup, nails, and lashes. Find your perfect look and book your appointment.
        </p>

        {/* Category Buttons */}
        <div className="flex flex-wrap justify-center gap-3 mb-4">
          <button
            className={`px-5 py-2 rounded-full font-semibold border transition-all duration-200 text-sm md:text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:ring-offset-2 ${
              selectedCategory === "All"
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-white text-purple-700 border-gray-300 hover:bg-purple-50"
            }`}
            onClick={() => handleCategoryChange("All")}
          >
            All
          </button>

          {categories.map((cat) => (
            <button
              key={cat}
              className={`px-5 py-2 rounded-full font-semibold border transition-all duration-200 text-sm md:text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:ring-offset-2 ${
                selectedCategory === cat
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white text-purple-700 border-gray-300 hover:bg-purple-50"
              }`}
              onClick={() => handleCategoryChange(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Hair Sub-Buttons */}
        {selectedCategory === "Hair" && (
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {hairGenders.map((gender) => (
              <button
                key={gender}
                className={`px-4 py-1.5 rounded-full font-medium border transition-all duration-200 text-sm md:text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:ring-offset-2 ${
                  selectedHairGender === gender
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-white text-purple-700 border-gray-300 hover:bg-purple-50"
                }`}
                onClick={() => handleGenderChange(gender)}
              >
                {gender}
              </button>
            ))}
          </div>
        )}

        {/* Result count */}
        <p className="text-sm text-gray-500 mb-4">
          Showing {(page - 1) * ITEMS_PER_PAGE + 1}–
          {Math.min(page * ITEMS_PER_PAGE, filteredServices.length)} of{" "}
          {filteredServices.length} services
        </p>

        {/* Service Images Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
          {paginatedServices.map((service) => (
            <div
              key={service.id}
              className="relative w-full h-80 rounded-2xl overflow-hidden shadow-xl border border-gray-200 bg-gray-100 group"
            >
              <Image
                src={service.image}
                alt={service.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute bottom-0 left-0 w-full bg-linear-to-t from-black/80 via-black/40 to-transparent px-4 py-3 flex flex-col items-center">
                <h3 className="text-lg md:text-xl font-bold text-white mb-1 drop-shadow-lg">
                  {service.name}
                </h3>
                <p className="text-sm text-yellow-300 font-semibold mb-1 drop-shadow">
                  ₦{service.price.toLocaleString()}
                </p>
                <p className="text-xs text-white/80 font-medium mb-1">{service.category}</p>
                <Link
                  href="/book-appointment"
                  className="mt-2 px-6 py-2 rounded-lg bg-purple-600 text-white font-bold text-sm shadow-lg hover:bg-purple-700 transition-all duration-200 text-center"
                >
                  Book Now
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10 flex-wrap">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-purple-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                  p === page
                    ? "bg-purple-600 text-white"
                    : "border border-gray-300 text-gray-700 hover:bg-purple-50"
                }`}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-purple-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
