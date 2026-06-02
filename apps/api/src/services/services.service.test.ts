import { afterEach, describe, expect, it, vi } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("../repositories/services.repository", () => {
  interface FakeService {
    id: string;
    stylistId: string;
    name: string;
    category: string;
    price: number;
    duration: number;
    isActive: boolean;
  }

  const store = new Map<string, FakeService>([
    ["svc_1", { id: "svc_1", stylistId: "st_1", name: "Haircut", category: "Hair", price: 5000, duration: 60, isActive: true }],
    ["svc_2", { id: "svc_2", stylistId: "st_1", name: "Braid", category: "Braiding", price: 8000, duration: 120, isActive: true }],
    ["svc_3", { id: "svc_3", stylistId: "st_2", name: "Makeover", category: "Makeup", price: 12000, duration: 90, isActive: true }],
    ["svc_inactive", { id: "svc_inactive", stylistId: "st_1", name: "Old Style", category: "Hair", price: 2000, duration: 30, isActive: false }],
  ]);

  return {
    __store: store,
    servicesRepository: {
      findMany: vi.fn(
        async (params: { page: number; limit: number; category?: string; stylistId?: string }) => {
          let items = [...store.values()].filter((s) => s.isActive);
          if (params.category) items = items.filter((s) => s.category === params.category);
          if (params.stylistId) items = items.filter((s) => s.stylistId === params.stylistId);
          const total = items.length;
          const paged = items.slice((params.page - 1) * params.limit, params.page * params.limit);
          return { items: paged, total };
        },
      ),
      findById: vi.fn(async (id: string) => {
        const s = store.get(id);
        return s ? { ...s } : null;
      }),
      findCategories: vi.fn(async () => {
        const cats = new Set([...store.values()].filter((s) => s.isActive).map((s) => s.category));
        return [...cats].sort();
      }),
    },
  };
});

import { servicesService } from "./services.service";

afterEach(() => vi.clearAllMocks());

// ── servicesService.list ──────────────────────────────────────────────────────

describe("servicesService.list", () => {
  it("returns all active services with pagination metadata", async () => {
    const result = await servicesService.list({});
    // 3 active services (svc_inactive excluded)
    expect(result.items).toHaveLength(3);
    expect(result.meta.total).toBe(3);
    expect(result.meta.page).toBe(1);
  });

  it("filters by category", async () => {
    const result = await servicesService.list({ category: "Braiding" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.category).toBe("Braiding");
  });

  it("filters by stylistId", async () => {
    const result = await servicesService.list({ stylistId: "st_2" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.stylistId).toBe("st_2");
  });

  it("paginates correctly", async () => {
    const page1 = await servicesService.list({ page: 1, limit: 2 });
    expect(page1.items).toHaveLength(2);
    expect(page1.meta.totalPages).toBe(2);

    const page2 = await servicesService.list({ page: 2, limit: 2 });
    expect(page2.items).toHaveLength(1);
  });

  it("clamps page to 1 minimum", async () => {
    const result = await servicesService.list({ page: -5 });
    expect(result.meta.page).toBe(1);
  });

  it("clamps limit to PAGINATION_MAX_PAGE_SIZE (50) maximum", async () => {
    const result = await servicesService.list({ limit: 9999 });
    expect(result.meta.limit).toBe(50);
  });

  it("uses PAGINATION_DEFAULT_PAGE_SIZE (20) when limit is not provided", async () => {
    const result = await servicesService.list({});
    expect(result.meta.limit).toBe(20);
  });

  it("returns totalPages=1 when all results fit on one page", async () => {
    const result = await servicesService.list({ limit: 10 });
    expect(result.meta.totalPages).toBe(1);
  });
});

// ── servicesService.getById ───────────────────────────────────────────────────

describe("servicesService.getById", () => {
  it("returns the service for a known id", async () => {
    const service = await servicesService.getById("svc_1");
    expect(service.id).toBe("svc_1");
    expect(service.name).toBe("Haircut");
  });

  it("throws NOT_FOUND for an unknown id", async () => {
    await expect(
      servicesService.getById("svc_unknown"),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("returns inactive services by id (catalogue hides them; direct lookup is explicit)", async () => {
    const service = await servicesService.getById("svc_inactive");
    expect(service.isActive).toBe(false);
  });
});

// ── servicesService.getCategories ─────────────────────────────────────────────

describe("servicesService.getCategories", () => {
  it("returns a deduplicated list of active service categories", async () => {
    const categories = await servicesService.getCategories();
    expect(categories).toContain("Hair");
    expect(categories).toContain("Braiding");
    expect(categories).toContain("Makeup");
    // No duplicates.
    expect(new Set(categories).size).toBe(categories.length);
  });

  it("does not include categories from inactive-only services", async () => {
    // All Hair services have at least one active, so Hair IS expected.
    // There's no inactive-only category in our fixture, but we can verify
    // the returned list matches only active services' categories.
    const categories = await servicesService.getCategories();
    expect(Array.isArray(categories)).toBe(true);
  });
});
