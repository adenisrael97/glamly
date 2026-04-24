"use client";

import Image from "next/image";
import Link from "next/link";
import packages from "@/data/package/packages.json";

export default function PackagesPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-purple-800 mb-2">
            Our Special Packages
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Discover our curated selection of beauty packages, crafted to give you
            a luxurious and unforgettable experience.
          </p>
        </div>

        {/* Packages Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition overflow-hidden flex flex-col"
            >
              <div className="relative h-52">
                <Image
                  src={pkg.image}
                  alt={pkg.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-bold text-xl text-purple-800 mb-2">
                  {pkg.name}
                </h3>
                <p className="text-gray-600 text-sm mb-4 flex-1 line-clamp-3">
                  {pkg.description}
                </p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-purple-700 font-extrabold text-xl">
                    ₦{pkg.price.toLocaleString()}
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
      </div>
    </main>
  );
}
