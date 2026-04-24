"use client";

import React from "react";
import {
  FaStar,
  FaHandsHelping,
  FaLeaf,
} from "react-icons/fa";

const features = [
  {
    icon: <FaStar className="text-2xl text-purple-500" />,
    title: "Excellence",
    desc: "Top-tier results and experiences.",
  },
  {
    icon: <FaHandsHelping className="text-2xl text-yellow-500" />,
    title: "Personal Care",
    desc: "Tailored service for you.",
  },
  {
    icon: <FaLeaf className="text-2xl text-green-500" />,
    title: "Sustainability",
    desc: "Eco-friendly practices.",
  },
];

const stats = [
  { value: "10+", label: "Years of Experience", borderClass: "border-purple-400", textClass: "text-purple-600" },
  { value: "5,000+", label: "Happy Clients", borderClass: "border-yellow-400", textClass: "text-yellow-600" },
  { value: "25", label: "Expert Stylists", borderClass: "border-pink-400", textClass: "text-pink-600" },
  { value: "12", label: "Industry Awards", borderClass: "border-green-400", textClass: "text-green-600" },
];

export default function OurStory() {
  return (
    <section className="w-full bg-linear-to-br from-purple-50 via-yellow-50 to-pink-50 py-10 px-2 sm:px-4">
      <div className="max-w-7xl mx-auto flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">

        {/* LEFT CONTENT */}
        <div className="w-full mb-8 lg:mb-0">
          <h2 className="text-3xl md:text-4xl font-extrabold text-purple-800 mb-2 uppercase">
            Our Story
          </h2>
          <p className="text-lg md:text-xl text-yellow-600 font-semibold mb-2">
            A Decade of Artistry
          </p>
          <p className="text-gray-700 mb-8 leading-relaxed text-justify">
            For over ten years, Glamly has been at the forefront of beauty and self-expression. Our journey is built on a passion for excellence, a commitment to personal care, and a vision for a more sustainable beauty industry. We have empowered thousands of clients to embrace their unique style, supported by a team of expert stylists who believe in the power of transformation. From the latest trends to timeless classics, we are dedicated to making every experience memorable and meaningful.
          </p>

          {/* FEATURES */}
          <div className="flex flex-row justify-between gap-4 sm:gap-8 md:gap-10 w-full overflow-x-auto">
            {features.map((item, i) => (
              <div
                key={i}
                className="flex flex-col items-center text-center w-28 hover:scale-105 transition-transform"
              >
                {item.icon}
                <h4 className="text-sm font-bold mt-1 text-gray-800">
                  {item.title}
                </h4>
                <p className="text-xs text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT STATS */}
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-4 sm:gap-6 w-full h-full min-h-65">
          {stats.map((stat, i) => (
            <div
              key={i}
              className={`bg-white rounded-xl shadow-md p-4 sm:p-6 flex flex-col items-center justify-center h-full border-t-4 ${stat.borderClass} hover:shadow-xl transition w-full min-w-0`}
            >
              <span
                className={`text-3xl font-extrabold ${stat.textClass}`}
              >
                {stat.value}
              </span>
              <span className="text-sm font-semibold text-gray-700 text-center">
                {stat.label}
              </span>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}