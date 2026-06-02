import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";

// ── SWR cache isolation ────────────────────────────────────────────────────────
// SWR shares a global cache. Clear it between tests to avoid state bleed.
import { SWRConfig } from "swr";
import type { ReactNode } from "react";

function swrWrapper({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

// ── Mock the bookingsApi module ────────────────────────────────────────────────
vi.mock("@/lib/api", () => ({
  bookingsApi: {
    listMine: vi.fn(),
    getById: vi.fn(),
  },
}));

import { useMyBookings, useBooking } from "@/hooks/useBookings";
import { bookingsApi } from "@/lib/api";

const listMine = bookingsApi.listMine as ReturnType<typeof vi.fn>;
const getById = bookingsApi.getById as ReturnType<typeof vi.fn>;

const fakeBooking = {
  id: "bk_1",
  userId: "user_1",
  stylistId: "st_1",
  status: "PENDING",
  startTime: "2026-06-05T10:00:00.000Z",
  totalAmount: 5000,
};

const fakeResult = {
  items: [fakeBooking],
  meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
  view: "customer",
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── useMyBookings ─────────────────────────────────────────────────────────────

describe("useMyBookings", () => {
  it("fetches bookings and returns items when enabled=true", async () => {
    listMine.mockResolvedValueOnce(fakeResult);

    const { result } = renderHook(() => useMyBookings({}, true), {
      wrapper: swrWrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.bookings).toHaveLength(1);
    expect(result.current.bookings[0]!.id).toBe("bk_1");
    expect(result.current.view).toBe("customer");
    expect(result.current.isError).toBe(false);
    expect(listMine).toHaveBeenCalledTimes(1);
  });

  it("does not fetch when enabled=false", () => {
    const { result } = renderHook(() => useMyBookings({}, false), {
      wrapper: swrWrapper,
    });

    // SWR key is null — no fetch should occur.
    expect(result.current.isLoading).toBe(false);
    expect(listMine).not.toHaveBeenCalled();
    expect(result.current.bookings).toHaveLength(0);
  });

  it("returns empty bookings and isError=true when the API call fails", async () => {
    listMine.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useMyBookings({}, true), {
      wrapper: swrWrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.bookings).toHaveLength(0);
  });

  it("passes params through to the API call", async () => {
    listMine.mockResolvedValueOnce({ ...fakeResult, items: [] });

    const { result } = renderHook(() => useMyBookings({ status: "PENDING" }, true), {
      wrapper: swrWrapper,
    });

    await waitFor(() => !result.current.isLoading);
    expect(listMine).toHaveBeenCalledWith({ status: "PENDING" });
  });

  it("exposes a mutate function for cache invalidation", async () => {
    listMine.mockResolvedValue(fakeResult);

    const { result } = renderHook(() => useMyBookings({}, true), {
      wrapper: swrWrapper,
    });

    await waitFor(() => !result.current.isLoading);
    expect(typeof result.current.mutate).toBe("function");
  });
});

// ── useBooking (single booking) ────────────────────────────────────────────────

describe("useBooking", () => {
  it("fetches a single booking by id", async () => {
    getById.mockResolvedValueOnce(fakeBooking);

    const { result } = renderHook(() => useBooking("bk_1", true), {
      wrapper: swrWrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.booking?.id).toBe("bk_1");
    expect(result.current.isError).toBe(false);
    expect(getById).toHaveBeenCalledWith("bk_1");
  });

  it("does not fetch when id is null", () => {
    const { result } = renderHook(() => useBooking(null, true), {
      wrapper: swrWrapper,
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.booking).toBeNull();
    expect(getById).not.toHaveBeenCalled();
  });

  it("does not fetch when enabled=false", () => {
    const { result } = renderHook(() => useBooking("bk_1", false), {
      wrapper: swrWrapper,
    });

    expect(result.current.booking).toBeNull();
    expect(getById).not.toHaveBeenCalled();
  });

  it("returns null booking and isError=true on API failure", async () => {
    getById.mockRejectedValueOnce(new Error("Not found"));

    const { result } = renderHook(() => useBooking("bk_missing", true), {
      wrapper: swrWrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.booking).toBeNull();
  });
});
