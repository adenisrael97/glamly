"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useServices, useServiceCategories } from "@/hooks/useServices";
import { CardSkeleton } from "@/components/ui/Skeleton";

const ITEMS_PER_PAGE = 12;

export default function ServicesPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [page, setPage] = useState(1);

  const { categories } = useServiceCategories();
  const { services, meta, isLoading, isError } = useServices({
    page,
    limit: ITEMS_PER_PAGE,
    category: activeCategory === "All" ? undefined : activeCategory,
  });

  const allCategories = ["All", ...categories];
  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? 0;

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setPage(1);
  };

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-purple-800 mb-2">Our Services</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Discover our wide range of beauty and grooming services tailored just for you. From
            stunning hairstyles to flawless makeup, we&apos;ve got you covered.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-purple-300 focus:ring-offset-2 ${
                activeCategory === cat
                  ? "bg-purple-600 text-white shadow-md"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-purple-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Result count */}
        {!isLoading && total > 0 && (
          <p className="text-center text-sm text-gray-500 mb-6">
            Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, total)} of{" "}
            {total} services
          </p>
        )}

        {isError && (
          <div className="text-center py-12" role="alert">
            <p className="text-red-500">Couldn&apos;t load services. Please try again.</p>
          </div>
        )}

        {/* Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)
            : services.map((service) => (
                <div
                  key={service.id}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden flex flex-col"
                >
                  <div className="relative h-48 bg-linear-to-br from-purple-100 via-pink-50 to-yellow-50">
                    {service.imageUrl && (
                      <Image
                        src={service.imageUrl}
                        alt={service.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-lg text-gray-900 leading-tight">{service.name}</h3>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full shrink-0 ml-2">
                        {service.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">
                      by {service.stylist.user.name} · {service.stylist.location}
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-2">
                      <span className="text-purple-700 font-bold text-lg">
                        ₦{service.price.toLocaleString()}
                      </span>
                      <Link
                        href={`/book-appointment?stylistId=${service.stylistId}&serviceId=${service.id}`}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-lg transition-colors duration-200"
                      >
                        Book Now
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
        </div>

        {!isLoading && !isError && services.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No services found in this category.</p>
          </div>
        )}

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
                  p === page ? "bg-purple-600 text-white" : "border border-gray-300 text-gray-700 hover:bg-purple-50"
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
    </main>
  );
}
