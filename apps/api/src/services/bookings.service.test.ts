import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES, ROLES, type Role } from "@glamly/shared";

// ── Mocks ─────────────────────────────────────────────────────────────────────
// Repositories are replaced with stateful in-memory fakes. The service logic
// (slot validation, ownership, state-machine transitions, pagination) runs for
// real; only Postgres, Redis, and notification side-effects are stubbed.

vi.mock("../repositories/bookings.repository", () => {
  type FakeBooking = {
    id: string;
    userId: string;
    stylistId: string;
    serviceId: string;
    startTime: Date;
    endTime: Date;
    totalAmount: number;
    status: string;
    notes?: string;
    idempotencyKey?: string;
    service: { id: string; name: string; category: string; price: number; duration: number };
    stylist: { id: string; specialty: string; location: string; avatarUrl: null; user: { name: string } };
  };

  const store = new Map<string, FakeBooking>();
  let seq = 0;

  function stub(partial: Partial<FakeBooking>): FakeBooking {
    return {
      id: `bk_${++seq}`,
      userId: "user_1",
      stylistId: "st_1",
      serviceId: "svc_1",
      startTime: new Date(),
      endTime: new Date(),
      totalAmount: 5000,
      status: "PENDING",
      service: { id: "svc_1", name: "Haircut", category: "Hair", price: 5000, duration: 60 },
      stylist: { id: "st_1", specialty: "Hair", location: "Lagos", avatarUrl: null, user: { name: "Jane" } },
      ...partial,
    };
  }

  return {
    __store: store,
    bookingsRepository: {
      findByIdempotencyKey: vi.fn(async (key: string) => {
        for (const b of store.values()) {
          if (b.idempotencyKey === key) return { ...b };
        }
        return null;
      }),
      findById: vi.fn(async (id: string) => {
        const b = store.get(id);
        return b ? { ...b } : null;
      }),
      findByIdWithDetails: vi.fn(async (id: string) => {
        const b = store.get(id);
        return b ? { ...b } : null;
      }),
      createWithSlotGuard: vi.fn(async (data: Parameters<typeof stub>[0]) => {
        const booking = stub({ ...data });
        store.set(booking.id, booking);
        return { ok: true, booking };
      }),
      listForUser: vi.fn(async (params: { userId: string; page: number; limit: number }) => {
        const items = [...store.values()].filter((b) => b.userId === params.userId);
        return { items, total: items.length };
      }),
      listForStylist: vi.fn(async (params: { stylistId: string; page: number; limit: number }) => {
        const items = [...store.values()].filter((b) => b.stylistId === params.stylistId);
        return { items, total: items.length };
      }),
      cancel: vi.fn(async (id: string, reason?: string) => {
        const b = store.get(id);
        if (!b) throw new Error("not found");
        b.status = "CANCELLED";
        if (reason) (b as Record<string, unknown>).cancellationReason = reason;
        return { ...b };
      }),
      rescheduleWithSlotGuard: vi.fn(
        async (params: { bookingId: string; startTime: Date; endTime: Date }) => {
          const b = store.get(params.bookingId);
          if (!b) return { ok: false, reason: "SLOT_TAKEN" };
          b.startTime = params.startTime;
          b.endTime = params.endTime;
          return { ok: true, booking: { ...b } };
        },
      ),
      markCompleted: vi.fn(async (id: string) => {
        const b = store.get(id);
        if (!b) throw new Error("not found");
        b.status = "COMPLETED";
        return { ...b };
      }),
    },
  };
});

vi.mock("../repositories/stylists.repository", () => ({
  stylistsRepository: {
    findActiveById: vi.fn(async (id: string) =>
      id === "st_1"
        ? { id: "st_1", isAvailable: true, specialty: "Hair", location: "Lagos" }
        : null,
    ),
    findIdByUserId: vi.fn(async (userId: string) =>
      userId === "stylist_user_1" ? "st_1" : null,
    ),
  },
}));

vi.mock("../repositories/services.repository", () => ({
  servicesRepository: {
    findById: vi.fn(async (id: string) =>
      id === "svc_1"
        ? { id: "svc_1", stylistId: "st_1", name: "Haircut", price: 5000, duration: 60, isActive: true }
        : null,
    ),
  },
}));

vi.mock("../repositories/audit.repository", () => ({
  auditRepository: { record: vi.fn(async () => {}) },
}));

vi.mock("./notifications.service", () => ({
  notificationsService: {
    notifySlotLocked: vi.fn(() => {}),
    sendBookingCancelled: vi.fn(async () => {}),
    sendBookingConfirmed: vi.fn(async () => {}),
  },
}));

import { bookingsService } from "./bookings.service";
import { bookingsRepository } from "../repositories/bookings.repository";
import * as bookingsRepoMod from "../repositories/bookings.repository";
import { stylistsRepository } from "../repositories/stylists.repository";

const repoStore = (
  bookingsRepoMod as unknown as { __store: Map<string, unknown> }
).__store;

const tomorrow10am = (): Date => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setUTCHours(10, 0, 0, 0);
  return d;
};

const CUSTOMER: { userId: string; role: Role } = { userId: "user_1", role: ROLES.USER };
const STYLIST_ACTOR: { userId: string; role: Role } = { userId: "stylist_user_1", role: ROLES.STYLIST };
const ADMIN: { userId: string; role: Role } = { userId: "admin_1", role: ROLES.ADMIN };

beforeEach(() => {
  repoStore.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ── bookingsService.create ───────────────────────────────────────────────────

describe("bookingsService.create", () => {
  it("creates a booking and returns idempotentReplay=false", async () => {
    const start = tomorrow10am();
    const result = await bookingsService.create(CUSTOMER, {
      stylistId: "st_1",
      serviceId: "svc_1",
      startTime: start.toISOString(),
    });

    expect(result.idempotentReplay).toBe(false);
    expect(result.booking.userId).toBe(CUSTOMER.userId);
    expect(result.booking.status).toBe("PENDING");
  });

  it("short-circuits with the original booking on idempotency key replay", async () => {
    const start = tomorrow10am();
    const key = "idem-key-1";
    const first = await bookingsService.create(CUSTOMER, {
      stylistId: "st_1",
      serviceId: "svc_1",
      startTime: start.toISOString(),
      idempotencyKey: key,
    });

    // Second call with same key from same actor → replay
    const second = await bookingsService.create(CUSTOMER, {
      stylistId: "st_1",
      serviceId: "svc_1",
      startTime: start.toISOString(),
      idempotencyKey: key,
    });

    expect(second.idempotentReplay).toBe(true);
    expect(second.booking.id).toBe(first.booking.id);
  });

  it("throws FORBIDDEN when a different actor replays another user's idempotency key", async () => {
    const start = tomorrow10am();
    const key = "idem-key-cross";
    await bookingsService.create(CUSTOMER, {
      stylistId: "st_1",
      serviceId: "svc_1",
      startTime: start.toISOString(),
      idempotencyKey: key,
    });

    const otherActor = { userId: "other_user", role: ROLES.USER };
    await expect(
      bookingsService.create(otherActor, {
        stylistId: "st_1",
        serviceId: "svc_1",
        startTime: start.toISOString(),
        idempotencyKey: key,
      }),
    ).rejects.toMatchObject({ code: ERROR_CODES.AUTH_FORBIDDEN });
  });

  it("throws NOT_FOUND when stylist does not exist", async () => {
    await expect(
      bookingsService.create(CUSTOMER, {
        stylistId: "st_unknown",
        serviceId: "svc_1",
        startTime: tomorrow10am().toISOString(),
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("throws NOT_FOUND when service is not for the given stylist", async () => {
    await expect(
      bookingsService.create(CUSTOMER, {
        stylistId: "st_1",
        serviceId: "svc_unknown",
        startTime: tomorrow10am().toISOString(),
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("throws SLOT_UNAVAILABLE for a past start time", async () => {
    const past = new Date(Date.now() - 60 * 60 * 1000);
    past.setUTCHours(10, 0, 0, 0);
    // Ensure it's definitely past
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    pastDate.setUTCHours(10, 0, 0, 0);

    await expect(
      bookingsService.create(CUSTOMER, {
        stylistId: "st_1",
        serviceId: "svc_1",
        startTime: pastDate.toISOString(),
      }),
    ).rejects.toMatchObject({ code: ERROR_CODES.BOOKING_SLOT_UNAVAILABLE });
  });

  it("throws SLOT_UNAVAILABLE for a start time outside working hours (e.g. 02:00 UTC)", async () => {
    const outOfHours = new Date();
    outOfHours.setDate(outOfHours.getDate() + 1);
    outOfHours.setUTCHours(2, 0, 0, 0);

    await expect(
      bookingsService.create(CUSTOMER, {
        stylistId: "st_1",
        serviceId: "svc_1",
        startTime: outOfHours.toISOString(),
      }),
    ).rejects.toMatchObject({ code: ERROR_CODES.BOOKING_SLOT_UNAVAILABLE });
  });

  it("throws SLOT_TAKEN when the repository returns ok=false", async () => {
    (bookingsRepository.createWithSlotGuard as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      reason: "SLOT_TAKEN",
    });

    await expect(
      bookingsService.create(CUSTOMER, {
        stylistId: "st_1",
        serviceId: "svc_1",
        startTime: tomorrow10am().toISOString(),
      }),
    ).rejects.toMatchObject({ code: ERROR_CODES.BOOKING_SLOT_TAKEN });
  });

  it("throws SLOT_UNAVAILABLE when stylist is not available", async () => {
    (stylistsRepository.findActiveById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: "st_1",
      isAvailable: false,
    });

    await expect(
      bookingsService.create(CUSTOMER, {
        stylistId: "st_1",
        serviceId: "svc_1",
        startTime: tomorrow10am().toISOString(),
      }),
    ).rejects.toMatchObject({ code: ERROR_CODES.BOOKING_SLOT_UNAVAILABLE });
  });
});

// ── bookingsService.listMine ─────────────────────────────────────────────────

describe("bookingsService.listMine", () => {
  it("returns customer-view for a USER actor", async () => {
    // Plant two bookings for this user
    repoStore.set("bk_a", {
      id: "bk_a", userId: "user_1", stylistId: "st_1", serviceId: "svc_1",
      startTime: new Date(), endTime: new Date(), totalAmount: 5000, status: "PENDING",
      service: { id: "svc_1", name: "X", category: "Hair", price: 5000, duration: 60 },
      stylist: { id: "st_1", specialty: "Hair", location: "Lagos", avatarUrl: null, user: { name: "J" } },
    } as Record<string, unknown>);

    const res = await bookingsService.listMine(CUSTOMER, {});
    expect(res.view).toBe("customer");
    expect(res.items).toHaveLength(1);
    expect(res.meta.total).toBe(1);
  });

  it("returns provider-view for a STYLIST actor", async () => {
    repoStore.set("bk_b", {
      id: "bk_b", userId: "user_2", stylistId: "st_1", serviceId: "svc_1",
      startTime: new Date(), endTime: new Date(), totalAmount: 5000, status: "PENDING",
      service: { id: "svc_1", name: "X", category: "Hair", price: 5000, duration: 60 },
      stylist: { id: "st_1", specialty: "Hair", location: "Lagos", avatarUrl: null, user: { name: "J" } },
    } as Record<string, unknown>);

    const res = await bookingsService.listMine(STYLIST_ACTOR, {});
    expect(res.view).toBe("provider");
    expect(res.items).toHaveLength(1);
  });

  it("returns empty provider-view when stylist has no profile", async () => {
    const noProfileStylist = { userId: "unregistered_stylist", role: ROLES.STYLIST };
    const res = await bookingsService.listMine(noProfileStylist, {});
    expect(res.view).toBe("provider");
    expect(res.items).toHaveLength(0);
  });

  it("clamps page to 1 and limit within [1, PAGINATION_MAX_PAGE_SIZE]", async () => {
    const res = await bookingsService.listMine(CUSTOMER, { page: -5, limit: 999 });
    expect(res.meta.page).toBe(1);
    expect(res.meta.limit).toBeLessThanOrEqual(50);
  });
});

// ── bookingsService.getByIdForActor ──────────────────────────────────────────

describe("bookingsService.getByIdForActor", () => {
  it("returns booking when actor is the customer", async () => {
    const start = tomorrow10am();
    const created = await bookingsService.create(CUSTOMER, {
      stylistId: "st_1", serviceId: "svc_1", startTime: start.toISOString(),
    });
    const booking = await bookingsService.getByIdForActor(CUSTOMER, created.booking.id);
    expect(booking.id).toBe(created.booking.id);
  });

  it("returns booking when actor is the assigned stylist", async () => {
    const start = tomorrow10am();
    const created = await bookingsService.create(CUSTOMER, {
      stylistId: "st_1", serviceId: "svc_1", startTime: start.toISOString(),
    });
    const booking = await bookingsService.getByIdForActor(STYLIST_ACTOR, created.booking.id);
    expect(booking.id).toBe(created.booking.id);
  });

  it("returns booking when actor is an ADMIN", async () => {
    const start = tomorrow10am();
    const created = await bookingsService.create(CUSTOMER, {
      stylistId: "st_1", serviceId: "svc_1", startTime: start.toISOString(),
    });
    const booking = await bookingsService.getByIdForActor(ADMIN, created.booking.id);
    expect(booking.id).toBe(created.booking.id);
  });

  it("throws FORBIDDEN when an unrelated user requests the booking", async () => {
    const start = tomorrow10am();
    const created = await bookingsService.create(CUSTOMER, {
      stylistId: "st_1", serviceId: "svc_1", startTime: start.toISOString(),
    });
    const stranger = { userId: "stranger_99", role: ROLES.USER };
    await expect(
      bookingsService.getByIdForActor(stranger, created.booking.id),
    ).rejects.toMatchObject({ code: ERROR_CODES.AUTH_FORBIDDEN });
  });

  it("throws BOOKING_NOT_FOUND for an unknown id", async () => {
    await expect(
      bookingsService.getByIdForActor(CUSTOMER, "nonexistent_id"),
    ).rejects.toMatchObject({ code: ERROR_CODES.BOOKING_NOT_FOUND });
  });
});

// ── bookingsService.cancel ────────────────────────────────────────────────────

describe("bookingsService.cancel", () => {
  it("cancels a PENDING booking and returns the updated row", async () => {
    const start = tomorrow10am();
    const { booking } = await bookingsService.create(CUSTOMER, {
      stylistId: "st_1", serviceId: "svc_1", startTime: start.toISOString(),
    });

    const updated = await bookingsService.cancel(CUSTOMER, booking.id, { reason: "Changed mind" });
    expect(updated.status).toBe("CANCELLED");
  });

  it("throws FORBIDDEN when a different customer tries to cancel", async () => {
    const start = tomorrow10am();
    const { booking } = await bookingsService.create(CUSTOMER, {
      stylistId: "st_1", serviceId: "svc_1", startTime: start.toISOString(),
    });

    const other = { userId: "other_user", role: ROLES.USER };
    await expect(
      bookingsService.cancel(other, booking.id, {}),
    ).rejects.toMatchObject({ code: ERROR_CODES.AUTH_FORBIDDEN });
  });

  it("throws BOOKING_INVALID_STATE when cancelling a CANCELLED booking", async () => {
    const start = tomorrow10am();
    const { booking } = await bookingsService.create(CUSTOMER, {
      stylistId: "st_1", serviceId: "svc_1", startTime: start.toISOString(),
    });
    await bookingsService.cancel(CUSTOMER, booking.id, {});

    await expect(
      bookingsService.cancel(CUSTOMER, booking.id, {}),
    ).rejects.toMatchObject({ code: ERROR_CODES.BOOKING_INVALID_STATE });
  });

  it("allows an ADMIN to cancel another user's booking", async () => {
    const start = tomorrow10am();
    const { booking } = await bookingsService.create(CUSTOMER, {
      stylistId: "st_1", serviceId: "svc_1", startTime: start.toISOString(),
    });
    const updated = await bookingsService.cancel(ADMIN, booking.id, {});
    expect(updated.status).toBe("CANCELLED");
  });
});

// ── bookingsService.reschedule ────────────────────────────────────────────────

describe("bookingsService.reschedule", () => {
  it("reschedules a PENDING booking to a new valid slot", async () => {
    const { booking } = await bookingsService.create(CUSTOMER, {
      stylistId: "st_1", serviceId: "svc_1", startTime: tomorrow10am().toISOString(),
    });

    const newSlot = new Date();
    newSlot.setDate(newSlot.getDate() + 2);
    newSlot.setUTCHours(11, 0, 0, 0);

    const updated = await bookingsService.reschedule(CUSTOMER, booking.id, {
      startTime: newSlot.toISOString(),
    });
    expect(updated.startTime).toEqual(newSlot);
  });

  it("throws SLOT_TAKEN when the new slot is unavailable", async () => {
    const { booking } = await bookingsService.create(CUSTOMER, {
      stylistId: "st_1", serviceId: "svc_1", startTime: tomorrow10am().toISOString(),
    });

    (bookingsRepository.rescheduleWithSlotGuard as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      reason: "SLOT_TAKEN",
    });

    const newSlot = new Date();
    newSlot.setDate(newSlot.getDate() + 2);
    newSlot.setUTCHours(11, 0, 0, 0);

    await expect(
      bookingsService.reschedule(CUSTOMER, booking.id, { startTime: newSlot.toISOString() }),
    ).rejects.toMatchObject({ code: ERROR_CODES.BOOKING_SLOT_TAKEN });
  });

  it("throws BOOKING_INVALID_STATE when rescheduling a CANCELLED booking", async () => {
    const { booking } = await bookingsService.create(CUSTOMER, {
      stylistId: "st_1", serviceId: "svc_1", startTime: tomorrow10am().toISOString(),
    });
    await bookingsService.cancel(CUSTOMER, booking.id, {});

    const newSlot = new Date();
    newSlot.setDate(newSlot.getDate() + 2);
    newSlot.setUTCHours(11, 0, 0, 0);

    await expect(
      bookingsService.reschedule(CUSTOMER, booking.id, { startTime: newSlot.toISOString() }),
    ).rejects.toMatchObject({ code: ERROR_CODES.BOOKING_INVALID_STATE });
  });
});

// ── bookingsService.complete ──────────────────────────────────────────────────

describe("bookingsService.complete", () => {
  it("allows the assigned stylist to complete a PENDING booking", async () => {
    const { booking } = await bookingsService.create(CUSTOMER, {
      stylistId: "st_1", serviceId: "svc_1", startTime: tomorrow10am().toISOString(),
    });

    const updated = await bookingsService.complete(STYLIST_ACTOR, booking.id);
    expect(updated.status).toBe("COMPLETED");
  });

  it("allows an ADMIN to complete any booking", async () => {
    const { booking } = await bookingsService.create(CUSTOMER, {
      stylistId: "st_1", serviceId: "svc_1", startTime: tomorrow10am().toISOString(),
    });
    const updated = await bookingsService.complete(ADMIN, booking.id);
    expect(updated.status).toBe("COMPLETED");
  });

  it("throws FORBIDDEN when the customer (non-provider) tries to complete", async () => {
    const { booking } = await bookingsService.create(CUSTOMER, {
      stylistId: "st_1", serviceId: "svc_1", startTime: tomorrow10am().toISOString(),
    });
    await expect(
      bookingsService.complete(CUSTOMER, booking.id),
    ).rejects.toMatchObject({ code: ERROR_CODES.AUTH_FORBIDDEN });
  });

  it("throws BOOKING_INVALID_STATE when completing a CANCELLED booking", async () => {
    const { booking } = await bookingsService.create(CUSTOMER, {
      stylistId: "st_1", serviceId: "svc_1", startTime: tomorrow10am().toISOString(),
    });
    await bookingsService.cancel(CUSTOMER, booking.id, {});

    await expect(
      bookingsService.complete(STYLIST_ACTOR, booking.id),
    ).rejects.toMatchObject({ code: ERROR_CODES.BOOKING_INVALID_STATE });
  });

  it("throws BOOKING_NOT_FOUND for an unknown booking id", async () => {
    await expect(
      bookingsService.complete(STYLIST_ACTOR, "ghost_id"),
    ).rejects.toMatchObject({ code: ERROR_CODES.BOOKING_NOT_FOUND });
  });
});
