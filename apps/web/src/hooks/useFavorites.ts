import { useCallback, useState } from "react";

// A persisted set of favourite stylist IDs (cuid strings). This is a local UI
// convenience (no backend "favourites" endpoint exists), so localStorage is the
// right store — it is not a mock of API data.

const STORAGE_KEY = "glamly_favorites";

function readStorage(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    return new Set(Array.isArray(raw) ? raw.map(String) : []);
  } catch {
    return new Set();
  }
}

function writeStorage(set: Set<string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

export interface UseFavorites {
  favorites: Set<string>;
  isFavorited: (id: string) => boolean;
  toggle: (id: string) => void;
  add: (id: string) => void;
  remove: (id: string) => void;
  count: number;
}

export function useFavorites(): UseFavorites {
  const [favorites, setFavorites] = useState<Set<string>>(readStorage);

  const update = useCallback((updater: (s: Set<string>) => Set<string>) => {
    setFavorites((prev) => {
      const next = updater(new Set(prev));
      writeStorage(next);
      return next;
    });
  }, []);

  const toggle = useCallback(
    (id: string) =>
      update((s) => {
        if (s.has(id)) s.delete(id);
        else s.add(id);
        return s;
      }),
    [update],
  );

  const add = useCallback(
    (id: string) =>
      update((s) => {
        s.add(id);
        return s;
      }),
    [update],
  );

  const remove = useCallback(
    (id: string) =>
      update((s) => {
        s.delete(id);
        return s;
      }),
    [update],
  );

  const isFavorited = useCallback((id: string) => favorites.has(id), [favorites]);

  return { favorites, isFavorited, toggle, add, remove, count: favorites.size };
}
