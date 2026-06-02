import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import {
  ROLES,
  SOCKET_EVENTS,
  type BookingCancelledPayload,
  type BookingConfirmedPayload,
  type Role,
  type SlotEventPayload,
} from "@glamly/shared";
import { config } from "../config";
import { logger } from "../lib/logger";
import { verifyAccessToken } from "../lib/jwt";
import { stylistsRepository } from "../repositories/stylists.repository";

// Realtime layer (CLAUDE.md §2 §5). All Socket.io wiring lives here so services
// emit through typed helpers and never touch the socket server directly.
//
// Rooms:
//   user:<userId>          — private; the user's own booking events land here.
//   availability:<stylistId> — public-ish; any authenticated client may watch a
//                              stylist's live slot changes (slot:locked/released).
// A stylist's own account is just another user room, so a provider gets booking
// events for their storefront via user:<their userId>.

interface SocketData {
  userId: string;
  role: Role;
}

let io: Server | null = null;

const userRoom = (userId: string) => `user:${userId}`;
const availabilityRoom = (stylistId: string) => `availability:${stylistId}`;

/**
 * Stand up the Socket.io server on the existing HTTP server. CORS mirrors the
 * REST allowlist; the handshake is authenticated with the same access token as
 * the REST API (passed as `auth.token`), so an unauthenticated socket is rejected
 * before it can join any room.
 */
export function initRealtime(httpServer: HttpServer): Server {
  const allowedOrigins = config.CORS_ORIGINS.split(",").map((o) => o.trim());

  io = new Server(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
  });

  // Auth handshake — verify the access token and stash identity on the socket.
  io.use((socket, next) => {
    const token = extractToken(socket);
    if (!token) return next(new Error("unauthorized"));
    try {
      const payload = verifyAccessToken(token);
      socket.data = { userId: payload.sub, role: payload.role } satisfies SocketData;
      next();
    } catch {
      // Coarse failure on purpose — any verify failure rejects the handshake; the
      // client reconnects after a token refresh.
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    void onConnection(socket);
  });

  logger.info("Socket.io realtime server initialised");
  return io;
}

async function onConnection(socket: Socket): Promise<void> {
  const { userId, role } = socket.data as SocketData;

  // Always join the private room so booking events reach this user.
  await socket.join(userRoom(userId));

  // A stylist also needs their storefront's availability stream (e.g. to watch
  // slots fill in real time on their dashboard).
  if (role === ROLES.STYLIST) {
    const stylistId = await stylistsRepository.findIdByUserId(userId);
    if (stylistId) await socket.join(availabilityRoom(stylistId));
  }

  // Customers browsing a stylist's calendar opt in to that stylist's slot stream.
  socket.on(SOCKET_EVENTS.AVAILABILITY_SUBSCRIBE, (stylistId: unknown) => {
    if (typeof stylistId === "string" && stylistId.length > 0) {
      void socket.join(availabilityRoom(stylistId));
    }
  });
  socket.on(SOCKET_EVENTS.AVAILABILITY_UNSUBSCRIBE, (stylistId: unknown) => {
    if (typeof stylistId === "string" && stylistId.length > 0) {
      void socket.leave(availabilityRoom(stylistId));
    }
  });
}

/** Pull the access token from the handshake (auth payload or Authorization header). */
function extractToken(socket: Socket): string | null {
  const fromAuth = (socket.handshake.auth as { token?: unknown } | undefined)?.token;
  if (typeof fromAuth === "string" && fromAuth.length > 0) return fromAuth;

  const header = socket.handshake.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim() || null;
  }
  return null;
}

// ─── Typed emit helpers (the only realtime surface services should call) ────────

/** A booking was confirmed — notify the customer and the stylist (their user rooms). */
export function emitBookingConfirmed(
  recipients: { customerUserId: string; stylistUserId: string },
  payload: BookingConfirmedPayload,
): void {
  if (!io) return;
  io.to(userRoom(recipients.customerUserId))
    .to(userRoom(recipients.stylistUserId))
    .emit(SOCKET_EVENTS.BOOKING_CONFIRMED, payload);
}

/** A booking was cancelled — notify the customer and the stylist. */
export function emitBookingCancelled(
  recipients: { customerUserId: string; stylistUserId: string },
  payload: BookingCancelledPayload,
): void {
  if (!io) return;
  io.to(userRoom(recipients.customerUserId))
    .to(userRoom(recipients.stylistUserId))
    .emit(SOCKET_EVENTS.BOOKING_CANCELLED, payload);
}

/** A slot was taken — broadcast to everyone watching this stylist's availability. */
export function emitSlotLocked(payload: SlotEventPayload): void {
  if (!io) return;
  io.to(availabilityRoom(payload.stylistId)).emit(SOCKET_EVENTS.SLOT_LOCKED, payload);
}

/** A slot was freed — broadcast to availability watchers so it reopens. */
export function emitSlotReleased(payload: SlotEventPayload): void {
  if (!io) return;
  io.to(availabilityRoom(payload.stylistId)).emit(SOCKET_EVENTS.SLOT_RELEASED, payload);
}

/** Notify a stylist their profile status changed (admin action). */
export function emitStylistStatusChanged(
  stylistUserId: string,
  payload: { status: string; reason?: string },
): void {
  if (!io) return;
  io.to(userRoom(stylistUserId)).emit("stylist:status_changed", payload);
}

/** Tear down for graceful shutdown. */
export async function closeRealtime(): Promise<void> {
  if (io) {
    await io.close();
    io = null;
  }
}
