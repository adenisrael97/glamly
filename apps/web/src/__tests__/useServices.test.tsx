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

vi.mock("@/lib/api", () => ({
  servicesApi: {
    list: vi.fn(),
    getCategories: vi.fn(),
  },
}));

import { useServices, useServiceCategories } from "@/hooks/useServices";
import { servicesApi } from "@/lib/api";

const listFn = servicesApi.list as ReturnType<typeof vi.fn>;
const categoriesFn = servicesApi.getCategories as ReturnType<typeof vi.fn>;

const fakeServices = {
  items: [
    { id: "svc_1", name: "Haircut", category: "Hair", price: 5000, duration: 60 },
  ],
  meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

describe("useServices", () => {
  it("fetches services and returns items", async () => {
    listFn.mockResolvedValueOnce(fakeServices);

    const { result } = renderHook(() => useServices({}), { wrapper: swrWrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.services).toHaveLength(1);
    expect(result.current.services[0]!.id).toBe("svc_1");
    expect(result.current.meta?.total).toBe(1);
    expect(result.current.isError).toBe(false);
  });

  it("filters by category param", async () => {
    listFn.mockResolvedValueOnce({ ...fakeServices, items: [] });

    const { result } = renderHook(() => useServices({ category: "Hair" }), {
      wrapper: swrWrapper,
    });

    await waitFor(() => !result.current.isLoading);
    expect(listFn).toHaveBeenCalledWith({ category: "Hair" });
  });

  it("returns empty array and isError=true on failure", async () => {
    listFn.mockRejectedValueOnce(new Error("Server error"));

    const { result } = renderHook(() => useServices({}), { wrapper: swrWrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.services).toHaveLength(0);
  });

  it("exposes a mutate function for cache invalidation", async () => {
    listFn.mockResolvedValueOnce(fakeServices);
    const { result } = renderHook(() => useServices({}), { wrapper: swrWrapper });
    await waitFor(() => !result.current.isLoading);
    expect(typeof result.current.mutate).toBe("function");
  });
});

describe("useServiceCategories", () => {
  it("fetches and returns categories", async () => {
    categoriesFn.mockResolvedValueOnce(["Hair", "Braiding", "Makeup"]);

    const { result } = renderHook(() => useServiceCategories(), { wrapper: swrWrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.categories).toEqual(["Hair", "Braiding", "Makeup"]);
    expect(result.current.isError).toBe(false);
  });

  it("returns empty array and isError=true on failure", async () => {
    categoriesFn.mockRejectedValueOnce(new Error("Fail"));

    const { result } = renderHook(() => useServiceCategories(), { wrapper: swrWrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.categories).toHaveLength(0);
  });
});
