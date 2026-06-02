import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import type { ReactNode } from "react";

function swrWrapper({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

// ── Mock the API module ────────────────────────────────────────────────────────
vi.mock("@/lib/api", () => ({
  stylistsApi: {
    list: vi.fn(),
    getById: vi.fn(),
    getAvailability: vi.fn(),
    listReviews: vi.fn(),
  },
}));

import { useStylists, useStylist, useAvailability, useStylistReviews } from "@/hooks/useStylists";
import { stylistsApi } from "@/lib/api";

const listFn = stylistsApi.list as ReturnType<typeof vi.fn>;
const getByIdFn = stylistsApi.getById as ReturnType<typeof vi.fn>;
const getAvailabilityFn = stylistsApi.getAvailability as ReturnType<typeof vi.fn>;
const listReviewsFn = stylistsApi.listReviews as ReturnType<typeof vi.fn>;

const fakeStylistListItem = {
  id: "st_1",
  specialty: "Hair",
  location: "Lagos",
  rating: 4.5,
  reviewCount: 10,
  priceFrom: 5000,
  user: { name: "Jane Doe" },
};

const fakeStylistDetail = {
  ...fakeStylistListItem,
  services: [],
  portfolio: [],
};

const fakePaginatedResult = {
  items: [fakeStylistListItem],
  meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

const fakeAvailability = {
  stylistId: "st_1",
  slots: [{ date: "2026-06-05", startTime: "2026-06-05T10:00:00.000Z", endTime: "2026-06-05T11:00:00.000Z" }],
};

const fakeReviewsResult = {
  items: [{ id: "rev_1", rating: 5, comment: "Great!" }],
  ratingsSummary: { average: 5, count: 1 },
  meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

// ── useStylists ────────────────────────────────────────────────────────────────

describe("useStylists", () => {
  it("fetches the stylist list and returns items", async () => {
    listFn.mockResolvedValueOnce(fakePaginatedResult);

    const { result } = renderHook(() => useStylists({}), { wrapper: swrWrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.stylists).toHaveLength(1);
    expect(result.current.stylists[0]!.id).toBe("st_1");
    expect(result.current.meta?.total).toBe(1);
    expect(result.current.isError).toBe(false);
  });

  it("passes filter params through to the API", async () => {
    listFn.mockResolvedValueOnce({ ...fakePaginatedResult, items: [] });

    const { result } = renderHook(() => useStylists({ category: "Hair", minRating: 4 }), {
      wrapper: swrWrapper,
    });

    await waitFor(() => !result.current.isLoading);
    expect(listFn).toHaveBeenCalledWith({ category: "Hair", minRating: 4 });
  });

  it("returns empty array and isError=true on failure", async () => {
    listFn.mockRejectedValueOnce(new Error("Server error"));

    const { result } = renderHook(() => useStylists({}), { wrapper: swrWrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.stylists).toHaveLength(0);
  });
});

// ── useStylist ─────────────────────────────────────────────────────────────────

describe("useStylist", () => {
  it("fetches stylist detail for a given id", async () => {
    getByIdFn.mockResolvedValueOnce(fakeStylistDetail);

    const { result } = renderHook(() => useStylist("st_1"), { wrapper: swrWrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stylist?.id).toBe("st_1");
  });

  it("does not fetch when id is null", () => {
    const { result } = renderHook(() => useStylist(null), { wrapper: swrWrapper });
    expect(result.current.stylist).toBeNull();
    expect(getByIdFn).not.toHaveBeenCalled();
  });

  it("returns null and isError=true on failure", async () => {
    getByIdFn.mockRejectedValueOnce(new Error("Not found"));

    const { result } = renderHook(() => useStylist("st_unknown"), { wrapper: swrWrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.stylist).toBeNull();
  });
});

// ── useAvailability ────────────────────────────────────────────────────────────

describe("useAvailability", () => {
  it("fetches availability slots for a given stylist", async () => {
    getAvailabilityFn.mockResolvedValueOnce(fakeAvailability);

    const { result } = renderHook(() => useAvailability("st_1", { days: 3 }), {
      wrapper: swrWrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.slots).toHaveLength(1);
    expect(result.current.availability).toEqual(fakeAvailability);
  });

  it("does not fetch when id is null", () => {
    const { result } = renderHook(() => useAvailability(null), { wrapper: swrWrapper });
    expect(result.current.slots).toHaveLength(0);
    expect(getAvailabilityFn).not.toHaveBeenCalled();
  });

  it("exposes a mutate function", async () => {
    getAvailabilityFn.mockResolvedValueOnce(fakeAvailability);

    const { result } = renderHook(() => useAvailability("st_1"), { wrapper: swrWrapper });
    await waitFor(() => !result.current.isLoading);
    expect(typeof result.current.mutate).toBe("function");
  });
});

// ── useStylistReviews ──────────────────────────────────────────────────────────

describe("useStylistReviews", () => {
  it("fetches reviews for a stylist", async () => {
    listReviewsFn.mockResolvedValueOnce(fakeReviewsResult);

    const { result } = renderHook(() => useStylistReviews("st_1"), { wrapper: swrWrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.reviews).toHaveLength(1);
    expect(result.current.ratingsSummary?.average).toBe(5);
  });

  it("does not fetch when id is null", () => {
    const { result } = renderHook(() => useStylistReviews(null), { wrapper: swrWrapper });
    expect(result.current.reviews).toHaveLength(0);
    expect(listReviewsFn).not.toHaveBeenCalled();
  });

  it("returns empty state on error", async () => {
    listReviewsFn.mockRejectedValueOnce(new Error("Fail"));

    const { result } = renderHook(() => useStylistReviews("st_1"), { wrapper: swrWrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.reviews).toHaveLength(0);
  });
});
