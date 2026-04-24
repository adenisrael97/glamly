import React from "react";
import Image from "next/image";
import stylists from "../../data/hairstylist/hairstylist.json";

export default function Hairstylists() {
  return (
    <section className="py-12 px-4 bg-white/90">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-2 text-purple-800 tracking-tight uppercase">MEET THE ARTISTS</h2>
        <p className="text-lg md:text-xl text-yellow-600 font-semibold mb-2">Our Expert Team</p>
        <p className="text-base md:text-lg text-gray-700 mb-6">
          Meet the creative minds behind GlamHub. Our expert stylists combine skill and passion to help you look and feel your best every day.
        </p>
      </div>
      <div className="w-full grid grid-cols-1 lg:grid-cols-4 md:grid-cols-1 gap-4 mt-8">
        {stylists.map((stylist) => (
          <div
            key={stylist.id}
            className="relative w-full h-100 rounded-2xl overflow-hidden shadow-2xl border border-gray-200 flex items-end justify-center bg-gray-100 animate-fade-in group"
          >
            <Image
              src={stylist.image}
              alt={stylist.name}
              fill
              sizes="(max-width: 768px) 100vw, 400px"
              className="object-cover w-full h-full animate-fade-in opacity-100"
            />
            <div className="absolute bottom-0 left-0 w-full bg-linear-to-t from-black/80 via-black/40 to-transparent px-8 py-6 flex flex-col items-start">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-1 drop-shadow-lg">{stylist.name}</h3>
              <p className="text-lg text-yellow-300 font-semibold mb-2 drop-shadow">Senior Hairstylist</p>
              <div className="flex items-center mb-2">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-6 h-6 text-yellow-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z" />
                  </svg>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
