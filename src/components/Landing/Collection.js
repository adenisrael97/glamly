"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import servicesData from "../../data/services.json";

const categories = ["Hair", "Makeup", "Eyes", "Nails"];
const hairGenders = ["Men", "Women"];

export default function Collection() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedHairGender, setSelectedHairGender] = useState(null);

  // Filter logic
  const filteredServices = servicesData.filter((service) => {
    if (selectedCategory === "All") return true;

    if (selectedCategory === "Hair") {
      if (selectedHairGender) {
        return service.category === "Hair" && service.gender === selectedHairGender;
      }
      return service.category === "Hair";
    }

    return service.category === selectedCategory;
  });

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
        <div className="flex flex-wrap justify-center gap-4 mb-4">
          <button
            className={`px-5 py-2 rounded-full font-semibold border transition-all duration-200 text-sm md:text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:ring-offset-2 mr-2 mb-2 ${
              selectedCategory === "All"
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-white text-purple-700 border-gray-300 hover:bg-purple-50"
            }`}
            onClick={() => {
              setSelectedCategory("All");
              setSelectedHairGender(null);
            }}
          >
            All
          </button>

          {categories.map((cat) => (
            <button
              key={cat}
              className={`px-5 py-2 rounded-full font-semibold border transition-all duration-200 text-sm md:text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:ring-offset-2 mr-2 mb-2 ${
                selectedCategory === cat
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white text-purple-700 border-gray-300 hover:bg-purple-50"
              }`}
              onClick={() => {
                setSelectedCategory(cat);
                setSelectedHairGender(null); // Reset hair sub-filter
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Hair Sub-Buttons */}
        {selectedCategory === "Hair" && (
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {hairGenders.map((gender) => (
              <button
                key={gender}
                className={`px-4 py-1 rounded-full font-medium border transition-all duration-200 text-sm md:text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:ring-offset-2 mr-2 mb-2 ${
                  selectedHairGender === gender
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-white text-purple-700 border-gray-300 hover:bg-purple-50"
                }`}
                onClick={() => setSelectedHairGender(gender)}
              >
                {gender}
              </button>
            ))}
          </div>
        )}

        {/* Service Images Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          {filteredServices.map((service) => (
            <div key={service.id} className="relative w-full h-80 rounded-2xl overflow-hidden shadow-xl border border-gray-200 bg-gray-100 group">
              <Image
                src={service.image}
                alt={service.name}
                fill
                sizes="(max-width: 768px) 100vw, 400px"
                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute bottom-0 left-0 w-full bg-linear-to-t from-black/80 via-black/40 to-transparent px-4 py-3 flex flex-col items-center">
                <h3 className="text-lg md:text-xl font-bold text-white mb-1 drop-shadow-lg">{service.name}</h3>
                <p className="text-sm text-yellow-300 font-semibold mb-1 drop-shadow">₦{service.price.toLocaleString()}</p>
                <p className="text-xs text-white/80 font-medium mb-1">{service.category}</p>
                <Link
                  href={`/book/${service.id}`}
                  className="mt-4 px-8 py-3 rounded-xl bg-purple-600 text-white font-bold text-base shadow-lg hover:bg-purple-700 transition-all duration-200 text-center"
                >
                  Select
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}