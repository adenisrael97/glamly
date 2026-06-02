import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ── Hoisted mock handles ───────────────────────────────────────────────────────
// vi.mock is hoisted above imports; variables it references must also be hoisted.

const { mockClose, mockOn, mockSocket, mockCreateRealtimeClient } = vi.hoisted(() => {
  const mockClose = vi.fn();
  const mockOn = vi.fn();
  const mockSocket = { on: mockOn, close: mockClose };
  const mockCreateRealtimeClient = vi.fn(() => mockSocket);
  return { mockClose, mockOn, mockSocket, mockCreateRealtimeClient };
});

vi.mock("@/lib/realtime", () => ({
  createRealtimeClient: mockCreateRealtimeClient,
  SOCKET_EVENTS: {
    BOOKING_CONFIRMED: "booking:confirmed",
    BOOKING_CANCELLED: "booking:cancelled",
    SLOT_LOCKED: "slot:locked",
    SLOT_RELEASED: "slot:released",
  },
}));

import { useRealtime } from "@/hooks/useRealtime";

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

describe("useRealtime", () => {
  it("does not create a socket when token is null", () => {
    renderHook(() => useRealtime(null));
    expect(mockCreateRealtimeClient).not.toHaveBeenCalled();
  });

  it("does not create a socket when token is undefined", () => {
    renderHook(() => useRealtime(undefined));
    expect(mockCreateRealtimeClient).not.toHaveBeenCalled();
  });

  it("creates a socket when a token is provided", () => {
    renderHook(() => useRealtime("tok_abc"));
    expect(mockCreateRealtimeClient).toHaveBeenCalledWith({ token: "tok_abc" });
  });

  it("registers all four event listeners", () => {
    renderHook(() => useRealtime("tok_abc"));
    const events = mockOn.mock.calls.map(([evt]) => evt as string);
    expect(events).toContain("booking:confirmed");
    expect(events).toContain("booking:cancelled");
    expect(events).toContain("slot:locked");
    expect(events).toContain("slot:released");
  });

  it("closes the socket on unmount", () => {
    const { unmount } = renderHook(() => useRealtime("tok_abc"));
    unmount();
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("calls onBookingConfirmed handler when the socket emits the event", () => {
    const onBookingConfirmed = vi.fn();
    renderHook(() => useRealtime("tok_abc", { onBookingConfirmed }));

    const call = mockOn.mock.calls.find(([evt]) => evt === "booking:confirmed");
    expect(call).toBeDefined();
    const handler = call![1] as (p: unknown) => void;
    const payload = { bookingId: "bk_1", userId: "u_1", stylistId: "st_1" };
    act(() => { handler(payload); });
    expect(onBookingConfirmed).toHaveBeenCalledWith(payload);
  });

  it("calls onBookingCancelled handler for booking:cancelled events", () => {
    const onBookingCancelled = vi.fn();
    renderHook(() => useRealtime("tok_abc", { onBookingCancelled }));

    const call = mockOn.mock.calls.find(([evt]) => evt === "booking:cancelled");
    const handler = call![1] as (p: unknown) => void;
    const payload = { bookingId: "bk_2" };
    act(() => { handler(payload); });
    expect(onBookingCancelled).toHaveBeenCalledWith(payload);
  });

  it("recreates the socket when the token changes", () => {
    const { rerender } = renderHook(({ token }) => useRealtime(token), {
      initialProps: { token: "tok_1" as string | null },
    });
    expect(mockCreateRealtimeClient).toHaveBeenCalledTimes(1);

    act(() => { rerender({ token: "tok_2" }); });
    expect(mockCreateRealtimeClient).toHaveBeenCalledTimes(2);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("closes the socket when token transitions to null", () => {
    const { rerender } = renderHook(({ token }) => useRealtime(token), {
      initialProps: { token: "tok_1" as string | null },
    });
    act(() => { rerender({ token: null }); });
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
