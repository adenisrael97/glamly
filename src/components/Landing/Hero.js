
"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Hero() {
  const router = useRouter();

  // Handle search form submission
  const handleSearch = (e) => {
    e.preventDefault();
    const service = e.target.service.value;
    const location = e.target.location.value;
    const date = e.target.date.value;
    router.push(`/Search?service=${service}&location=${location}&date=${date}`);
  };

  return (
    <div className="relative w-full min-h-screen flex items-center justify-center overflow-hidden">
      {/* Optimized Background Image */}
      <Image
        src="/images/background/background1.jpg"
        alt="Beauty service background"
        fill
        priority
        sizes="100vw"
        style={{ objectFit: 'cover', objectPosition: 'center' }}
        quality={75}
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-linear-to-br from-black/70 via-purple-900/60 to-yellow-100/30"></div>

      {/* Hero Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 max-w-3xl w-full">
        {/* Redesigned Headline */}
        <h1 className="text-4xl md:text-6xl font-extrabold mb-4 bg-linear-to-r from-purple-600 via-yellow-400 to-gray-900 bg-clip-text text-transparent drop-shadow-lg">
          Elevate Your Beauty Experience
        </h1>
        {/* Subheading */}
        <p className="text-lg md:text-2xl text-gray-100 mb-8 font-medium max-w-2xl mx-auto">
          Discover, book, and enjoy top-tier beauty services—hairstyles, makeup, nails, lashes, and more—delivered by trusted professionals, wherever you are.
        </p>
        {/* Call to Action */}
        <div className="mb-8">
          <span className="inline-block bg-yellow-400 text-black font-semibold px-4 py-2 rounded-full shadow-md text-base md:text-lg animate-bounce">
            Glamly: Beauty, On Demand
          </span>
        </div>
        {/* Search Form */}
        <form
          className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-6 flex flex-col md:flex-row gap-4 max-w-2xl w-full border border-gray-200"
          onSubmit={handleSearch}
        >
          {/* Service Dropdown */}
          <select
            name="service"
            className="p-3 rounded-lg flex-1 border border-gray-300 text-gray-700 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition"
          >
            <option value="Hair Styling">Hair Styling</option>
            <option value="Makeup">Makeup</option>
            <option value="Braiding">Braiding</option>
            <option value="Nails">Nails</option>
            <option value="Barber">Barber</option>
            <option value="Home Service">Home Service</option>
          </select>
          {/* Location Input */}
          <input
            type="text"
            name="location"
            placeholder="Enter your location"
            className="p-3 rounded-lg flex-1 border border-gray-300 text-gray-700 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition"
          />
          {/* Date Picker */}
          <input
            type="date"
            name="date"
            className="p-3 rounded-lg flex-1 border border-gray-300 text-gray-700 focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition"
          />
          {/* Search Button */}
          <button
            type="submit"
            className="bg-purple-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-yellow-400 hover:text-black transition-colors duration-200 shadow-md border-2 border-purple-600 hover:border-yellow-400"
          >
            Search Services
          </button>
        </form>
        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row gap-4 mt-8 w-full justify-center">
          <a
            href="/search"
            className="flex-1 md:flex-none bg-yellow-400 text-white font-bold px-8 py-3 rounded-lg shadow-lg border-2 border-purple-600 hover:bg-yellow-400 hover:text-black hover:border-yellow-400 transition-colors duration-200 text-lg text-center flex items-center justify-center"
            style={{ textDecoration: 'none' }}
          >
            Browse Services
          </a>
          <button
            className="flex-1 md:flex-none bg-purple-600 text-black font-bold px-8 py-3 rounded-lg shadow-lg border-2 border-yellow-400 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-colors duration-200 text-lg"
          >
            Become a Stylist
          </button>
		  <button
            className="flex-1 md:flex-none bg-yellow-400 text-black font-bold px-8 py-3 rounded-lg shadow-lg border-2 border-yellow-400 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-colors duration-200 text-lg"
          >
            Gift a Service
          </button>
        </div>
      </div>
    </div>
  );
}