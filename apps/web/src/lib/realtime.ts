import { io, type Socket } from "socket.io-client";
import { SOCKET_EVENTS } from "@glamly/shared";

// Frontend realtime client (CLAUDE.md §5: live availability + booking status).
// A thin wrapper over socket.io-client that authenticates with the same access
// token as the REST API and speaks the shared SOCKET_EVENTS contract, so event
// names can never drift from the server. The caller passes the current access
// token (held in memory by the API client).

export { SOCKET_EVENTS };

const DEFAULT_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api(\/v\d+)?\/?$/, "") ?? "http://localhost:4000";

export interface RealtimeClientOptions {
  /** Access token (Bearer) for the socket handshake. */
  token: string;
  /** API origin (no /api suffix). Defaults to NEXT_PUBLIC_API_URL's origin. */
  url?: string;
}

/** Open an authenticated realtime connection. */
export function createRealtimeClient({ token, url = DEFAULT_URL }: RealtimeClientOptions): Socket {
  return io(url, {
    auth: { token },
    transports: ["websocket"],
    autoConnect: true,
  });
}

/** Start watching a stylist's live availability (slot:locked / slot:released). */
export function subscribeAvailability(socket: Socket, stylistId: string): void {
  socket.emit(SOCKET_EVENTS.AVAILABILITY_SUBSCRIBE, stylistId);
}

/** Stop watching a stylist's availability. */
export function unsubscribeAvailability(socket: Socket, stylistId: string): void {
  socket.emit(SOCKET_EVENTS.AVAILABILITY_UNSUBSCRIBE, stylistId);
}
