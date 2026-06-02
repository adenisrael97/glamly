// Realtime (Socket.io) contract shared by api (emit) and web (listen). Centralising
// event names + payload shapes here stops the two apps drifting apart.

export const SOCKET_EVENTS = {
  // ── server → client ──────────────────────────────────────────────────────
  // A slot was taken (a PENDING booking now holds it) — availability watchers
  // should grey it out.
  SLOT_LOCKED: "slot:locked",
  // A slot was freed (booking cancelled/expired) — it can be booked again.
  SLOT_RELEASED: "slot:released",
  // The recipient's booking was confirmed by payment.
  BOOKING_CONFIRMED: "booking:confirmed",
  // The recipient's booking was cancelled.
  BOOKING_CANCELLED: "booking:cancelled",

  // ── client → server ──────────────────────────────────────────────────────
  // Watch / stop watching a stylist's live availability.
  AVAILABILITY_SUBSCRIBE: "availability:subscribe",
  AVAILABILITY_UNSUBSCRIBE: "availability:unsubscribe",
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

/** slot:locked / slot:released — ISO timestamps so the payload is JSON-safe. */
export interface SlotEventPayload {
  stylistId: string;
  startTime: string;
  endTime: string;
}

export interface BookingConfirmedPayload {
  bookingId: string;
  status: "CONFIRMED";
  startTime: string;
  serviceName: string;
  stylistName: string;
}

export interface BookingCancelledPayload {
  bookingId: string;
  status: "CANCELLED";
  reason: string | null;
}
