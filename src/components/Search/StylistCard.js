"use client";

import Image from "next/image";
import Link from "next/link";
import { memo, useState } from "react";

const StarIcon = ({ filled }) => (
  <svg
    className={`w-3.5 h-3.5 ${filled ? "text-yellow-400" : "text-gray-300"}`}
    fill="currentColor"
    viewBox="0 0 20 20"
  >
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z" />
  </svg>
);

const HeartIcon = ({ filled }) => (
  <svg
    className={`w-4.5 h-4.5 transition-colors duration-200 ${filled ? "text-red-500" : "text-gray-400"}`}
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={filled ? 0 : 2}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
    />
  </svg>
);

const LocationIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const StylistCard = memo(({ stylist, onBook, isFavorited = false, onToggleFavorite }) => {
  const [favorited, setFavorited] = useState(isFavorited);
  const [imgError, setImgError] = useState(false);

  const handleFavorite = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !favorited;
    setFavorited(next);
    onToggleFavorite?.(stylist.id, next);
  };

  const handleBook = (e) => {
    e.preventDefault();
    // Use existing /booking/[id] page which has packages + add-ons flow
    onBook?.(stylist.id);
  };

  const ratingStars = Math.round(stylist.rating);

  return (
    <article className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
      {/* Image section */}
      <div className="relative h-56 overflow-hidden bg-gray-100">
        {!imgError ? (
          <Image
            src={stylist.image}
            alt={stylist.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            quality={80}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-purple-100 to-pink-100">
            <span className="text-5xl">💆‍♀️</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent" />

        {/* Favorite button */}
        <button
          type="button"
          onClick={handleFavorite}
          aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-white hover:scale-110 transition-all duration-200 z-10"
        >
          <HeartIcon filled={favorited} />
        </button>

        {/* Availability badge */}
        <div className="absolute top-3 left-3 z-10">
          {stylist.available ? (
            <span className="inline-flex items-center gap-1 bg-green-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Available
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-gray-600/80 text-white text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm">
              Busy
            </span>
          )}
        </div>

        {/* Rating overlay */}
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
          <span className="text-yellow-400 text-xs">★</span>
          <span className="text-white text-xs font-semibold">{stylist.rating}</span>
        </div>

        {/* Distance overlay */}
        {stylist.distance && (
          <div className="absolute bottom-3 right-3 z-10 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
            <span className="text-white text-xs">{stylist.distance} km</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4">
        {/* Name + location */}
        <div className="mb-2">
          <h3 className="font-bold text-gray-900 text-base leading-tight mb-1 truncate">
            {stylist.name}
          </h3>
          <div className="flex items-center gap-1">
            <LocationIcon />
            <span className="text-gray-500 text-xs truncate">{stylist.location}</span>
            {stylist.experience && (
              <>
                <span className="text-gray-300 text-xs mx-1">·</span>
                <span className="text-gray-500 text-xs">{stylist.experience}yr exp</span>
              </>
            )}
          </div>
        </div>

        {/* Star rating row */}
        <div className="flex items-center gap-1.5 mb-3">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <StarIcon key={n} filled={n <= ratingStars} />
            ))}
          </div>
          <span className="text-xs text-gray-500">({stylist.rating})</span>
        </div>

        {/* Service tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {stylist.services.slice(0, 3).map((svc) => (
            <span
              key={svc}
              className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-medium border border-purple-100"
            >
              {svc}
            </span>
          ))}
          {stylist.services.length > 3 && (
            <span className="text-xs text-gray-400 px-2 py-1">
              +{stylist.services.length - 3}
            </span>
          )}
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
          <div>
            <span className="text-xs text-gray-400 block leading-none mb-0.5">Starting from</span>
            <span className="text-purple-700 font-extrabold text-base">
              ₦{stylist.price?.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/stylist/${stylist.id}`}
              className="px-3 py-2 text-xs font-semibold text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors duration-200"
            >
              Profile
            </Link>
            <button
              type="button"
              onClick={handleBook}
              disabled={!stylist.available}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors duration-200 shadow-sm"
            >
              Book
            </button>
          </div>
        </div>
      </div>
    </article>
  );
});

StylistCard.displayName = "StylistCard";

export default StylistCard;
