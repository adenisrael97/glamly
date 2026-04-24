"use client";

import Image from "next/image";
import { memo } from "react";

const StylistCard = memo(({ stylist, onBook }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
      <div className="relative h-48 mb-4 rounded-lg overflow-hidden">
        <Image
          src={stylist.image}
          alt={stylist.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          style={{ objectFit: 'cover' }}
          loading="lazy"
          quality={75}
        />
      </div>
      
      <h3 className="text-lg font-bold text-gray-900 mb-2">{stylist.name}</h3>
      <p className="text-gray-600 text-sm mb-2">{stylist.services?.join(", ")}</p>
      <p className="text-gray-600 text-sm mb-3">{stylist.location}</p>
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <span className="text-yellow-400">⭐</span>
          <span className="text-gray-700 ml-1">{stylist.rating}</span>
        </div>
        <span className="text-purple-600 font-bold">₦{stylist.price?.toLocaleString()}</span>
      </div>
      
      <button
        onClick={() => onBook(stylist.id)}
        className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
      >
        Book Now
      </button>
    </div>
  );
});

StylistCard.displayName = 'StylistCard';

export default StylistCard;