import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFavorites } from "@/hooks/useFavorites";

// Favourite IDs are stylist cuids (strings), so these tests use string IDs.

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
    store["glamly_favorites"] = JSON.stringify(["a1", "b2", "c3"]);
    const { result } = renderHook(() => useFavorites());
    expect(result.current.count).toBe(3);
    expect(result.current.isFavorited("b2")).toBe(true);
  });

  it("toggle adds an ID that is not present", () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggle("sty42"));
    expect(result.current.isFavorited("sty42")).toBe(true);
    expect(result.current.count).toBe(1);
  });

  it("toggle removes an ID that is already present", () => {
    store["glamly_favorites"] = JSON.stringify(["sty42"]);
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggle("sty42"));
    expect(result.current.isFavorited("sty42")).toBe(false);
    expect(result.current.count).toBe(0);
  });

  it("add stores the ID persistently", () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.add("sty7"));
    expect(result.current.isFavorited("sty7")).toBe(true);
    expect(JSON.parse(store["glamly_favorites"])).toContain("sty7");
  });

  it("remove deletes the ID", () => {
    store["glamly_favorites"] = JSON.stringify(["sty7", "sty8"]);
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.remove("sty7"));
    expect(result.current.isFavorited("sty7")).toBe(false);
    expect(result.current.isFavorited("sty8")).toBe(true);
  });

  it("isFavorited returns false for absent IDs", () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.isFavorited("nope")).toBe(false);
  });

  it("persists state to localStorage on every change", () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.add("one"));
    act(() => result.current.add("two"));
    const stored = new Set(JSON.parse(store["glamly_favorites"]));
    expect(stored.has("one")).toBe(true);
    expect(stored.has("two")).toBe(true);
  });
});
