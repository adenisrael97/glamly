"use client";

import { useEffect, useRef } from "react";
import type {
  BookingCancelledPayload,
  BookingConfirmedPayload,
  SlotEventPayload,
} from "@glamly/shared";
import { createRealtimeClient, SOCKET_EVENTS } from "@/lib/realtime";

// Maintains one authenticated realtime connection for the signed-in user and
// routes booking/slot events to caller-supplied handlers. Handlers are read
// through a ref so changing them never tears down the socket. Pass `token = null`
// (e.g. logged out) and the hook stays disconnected.
//
// Typical use: revalidate SWR caches on a booking event so the UI updates live.

export interface RealtimeHandlers {
  onBookingConfirmed?: (p: BookingConfirmedPayload) => void;
  onBookingCancelled?: (p: BookingCancelledPayload) => void;
  onSlotLocked?: (p: SlotEventPayload) => void;
  onSlotReleased?: (p: SlotEventPayload) => void;
}

export function useRealtime(token: string | null | undefined, handlers: RealtimeHandlers = {}): void {
  const handlersRef = useRef<RealtimeHandlers>(handlers);

  // Keep the latest handlers in the ref without re-running the socket effect.
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!token) return undefined;

    const socket = createRealtimeClient({ token });

    socket.on(SOCKET_EVENTS.BOOKING_CONFIRMED, (p: BookingConfirmedPayload) =>
      handlersRef.current.onBookingConfirmed?.(p),
    );
    socket.on(SOCKET_EVENTS.BOOKING_CANCELLED, (p: BookingCancelledPayload) =>
      handlersRef.current.onBookingCancelled?.(p),
    );
    socket.on(SOCKET_EVENTS.SLOT_LOCKED, (p: SlotEventPayload) =>
      handlersRef.current.onSlotLocked?.(p),
    );
    socket.on(SOCKET_EVENTS.SLOT_RELEASED, (p: SlotEventPayload) =>
      handlersRef.current.onSlotReleased?.(p),
    );

    return () => {
      socket.close();
    };
  }, [token]);
}
