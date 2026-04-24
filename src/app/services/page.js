"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import services from "@/data/services.json";

const categories = ["All", ...new Set(services.map((s) => s.category))];

export default function ServicesPage() {
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredServices = useMemo(() => {
    if (activeCategory === "All") return services;
    return services.filter((s) => s.category === activeCategory);
  }, [activeCategory]);

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-purple-800 mb-2">
            Our Services
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Discover our wide range of beauty and grooming services tailored just
            for you. From stunning hairstyles to flawless makeup, we&apos;ve got you covered.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat
                  ? "bg-purple-600 text-white shadow-md"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-purple-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-xl shadow-md hover:shadow-lg transition overflow-hidden"
            >
              <div className="relative h-48">
                <Image
                  src={service.image}
                  alt={service.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg text-gray-900">
                    {service.name}
                  </h3>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                    {service.category}
                  </span>
                </div>
                {service.gender && (
                  <p className="text-sm text-gray-500 mb-2">{service.gender}</p>
                )}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-purple-700 font-bold text-lg">
                    ₦{service.price.toLocaleString()}
                  </span>
                  <Link
                    href="/Search"
                    className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-lg transition"
                  >
                    Book Now
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredServices.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              No services found in this category.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}