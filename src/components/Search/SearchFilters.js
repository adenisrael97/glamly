"use client";

import { memo } from "react";

const SearchFilters = memo(({ 
  minRating, 
  setMinRating, 
  priceRange, 
  setPriceRange, 
  sortBy, 
  setSortBy,
  onFilterChange 
}) => {
  const handleMinRatingChange = (value) => {
    setMinRating(Number(value));
    onFilterChange();
  };

  const handlePriceChange = (type, value) => {
    const newRange = { ...priceRange, [type]: Number(value) };
    setPriceRange(newRange);
    onFilterChange();
  };

  const handleSortChange = (value) => {
    setSortBy(value);
    onFilterChange();
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col sm:flex-row gap-4 items-center">
      {/* Minimum Rating */}
      <div className="flex items-center gap-2">
        <label className="font-medium text-gray-700">Min Rating:</label>
        <select
          value={minRating}
          onChange={(e) => handleMinRatingChange(e.target.value)}
          className="px-2 py-1 border rounded-lg"
        >
          <option value={0}>All</option>
          <option value={1}>1⭐+</option>
          <option value={2}>2⭐+</option>
          <option value={3}>3⭐+</option>
          <option value={4}>4⭐+</option>
          <option value={5}>5⭐</option>
        </select>
      </div>

      {/* Price Range */}
      <div className="flex items-center gap-2">
        <label className="font-medium text-gray-700">Price:</label>
        <input
          type="number"
          placeholder="Min"
          value={priceRange.min || ''}
          onChange={(e) => handlePriceChange('min', e.target.value)}
          className="w-20 px-2 py-1 border rounded-lg"
        />
        <span>-</span>
        <input
          type="number"
          placeholder="Max"
          value={priceRange.max || ''}
          onChange={(e) => handlePriceChange('max', e.target.value)}
          className="w-20 px-2 py-1 border rounded-lg"
        />
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2">
        <label className="font-medium text-gray-700">Sort by:</label>
        <select
          value={sortBy}
          onChange={(e) => handleSortChange(e.target.value)}
          className="px-2 py-1 border rounded-lg"
        >
          <option value="">Default</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="rating-desc">Rating: High to Low</option>
        </select>
      </div>
    </div>
  );
});

SearchFilters.displayName = 'SearchFilters';

export default SearchFilters;