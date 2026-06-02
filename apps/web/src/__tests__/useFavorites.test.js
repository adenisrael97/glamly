import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFavorites } from "@/hooks/useFavorites";

// ── localStorage mock ─────────────────────────────────────────────────────────

const store = {};
const localStorageMock = {
  getItem: vi.fn((key) => store[key] ?? null),
  setItem: vi.fn((key, value) => { store[key] = value; }),
  removeItem: vi.fn((key) => { delete store[key]; }),
  clear: vi.fn(() => { Object.keys(store).forEach((k) => delete store[k]); }),
};

beforeEach(() => {
  vi.stubGlobal("localStorage", localStorageMock);
  localStorageMock.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useFavorites", () => {
  it("initialises with an empty set when localStorage is empty", () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.count).toBe(0);
    expect(result.current.favorites.size).toBe(0);
  });

  it("hydrates from localStorage on mount", () => {
    store["glamly_favorites"] = JSON.stringify([1, 2, 3]);
    const { result } = renderHook(() => useFavorites());
    expect(result.current.count).toBe(3);
    expect(result.current.isFavorited(2)).toBe(true);
  });

  it("toggle adds an ID that is not present", () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggle(42));
    expect(result.current.isFavorited(42)).toBe(true);
    expect(result.current.count).toBe(1);
  });

  it("toggle removes an ID that is already present", () => {
    store["glamly_favorites"] = JSON.stringify([42]);
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggle(42));
    expect(result.current.isFavorited(42)).toBe(false);
    expect(result.current.count).toBe(0);
  });

  it("add stores the ID persistently", () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.add(7));
    expect(result.current.isFavorited(7)).toBe(true);
    expect(JSON.parse(store["glamly_favorites"])).toContain(7);
  });

  it("remove deletes the ID", () => {
    store["glamly_favorites"] = JSON.stringify([7, 8]);
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.remove(7));
    expect(result.current.isFavorited(7)).toBe(false);
    expect(result.current.isFavorited(8)).toBe(true);
  });

  it("isFavorited returns false for absent IDs", () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.isFavorited(999)).toBe(false);
  });

  it("persists state to localStorage on every change", () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.add(1));
    act(() => result.current.add(2));
    const stored = new Set(JSON.parse(store["glamly_favorites"]));
    expect(stored.has(1)).toBe(true);
    expect(stored.has(2)).toBe(true);
  });
});
