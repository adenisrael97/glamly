import { useState, useCallback } from "react";

const STORAGE_KEY = "glamly_favorites";

function readStorage() {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

function writeStorage(set) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

/**
 * Manages a persisted set of favourite stylist IDs.
 *
 * @returns {{
 *   favorites: Set<number>,
 *   isFavorited: (id: number) => boolean,
 *   toggle: (id: number) => void,
 *   add: (id: number) => void,
 *   remove: (id: number) => void,
 *   count: number,
 * }}
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState(readStorage);

  const update = useCallback((updater) => {
    setFavorites((prev) => {
      const next = updater(new Set(prev));
      writeStorage(next);
      return next;
    });
  }, []);

  const toggle = useCallback(
    (id) => update((s) => (s.has(id) ? (s.delete(id), s) : (s.add(id), s))),
    [update]
  );

  const add = useCallback((id) => update((s) => (s.add(id), s)), [update]);

  const remove = useCallback((id) => update((s) => (s.delete(id), s)), [update]);

  const isFavorited = useCallback((id) => favorites.has(id), [favorites]);

  return { favorites, isFavorited, toggle, add, remove, count: favorites.size };
}
