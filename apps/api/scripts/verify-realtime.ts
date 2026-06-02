import "dotenv/config";
import { io, type Socket } from "socket.io-client";
import { SOCKET_EVENTS } from "@glamly/shared";
import { prisma } from "../src/lib/prisma";

// Live-update gate verification (CLAUDE.md §5/§8). Stands in for the "two browser
// tabs" check: connects real Socket.io clients (each socket = one tab), drives a
// real booking create + cancel through the HTTP API, and asserts who receives
// which realtime event. Also proves recipient correctness — the stylist gets the
// cancellation, an unrelated user does NOT.
//
// Run against a running API:  API=http://localhost:4010 npx tsx scripts/verify-realtime.ts

const API = `${process.env.API ?? "http://localhost:4010"}/api/v1`;
const SOCKET_URL = process.env.API ?? "http://localhost:4010";
const stamp = Date.now();

interface Captured {
  slotLocked: unknown[];
  slotReleased: unknown[];
  cancelled: unknown[];
  confirmed: unknown[];
}

function listen(socket: Socket): Captured {
  const cap: Captured = { slotLocked: [], slotReleased: [], cancelled: [], confirmed: [] };
  socket.on(SOCKET_EVENTS.SLOT_LOCKED, (p) => cap.slotLocked.push(p));
  socket.on(SOCKET_EVENTS.SLOT_RELEASED, (p) => cap.slotReleased.push(p));
  socket.on(SOCKET_EVENTS.BOOKING_CANCELLED, (p) => cap.cancelled.push(p));
  socket.on(SOCKET_EVENTS.BOOKING_CONFIRMED, (p) => cap.confirmed.push(p));
  return cap;
}

async function api(path: string, token: string, method: string, body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as { success: boolean; data?: unknown; error?: unknown };
  if (!json.success) throw new Error(`${method} ${path} failed: ${JSON.stringify(json.error)}`);
  return json.data as never;
}

async function register(role: "user" | "stylist", extra: Record<string, unknown> = {}) {
  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `${role}-${stamp}`,
      email: `${role}-${stamp}-${Math.random().toString(36).slice(2, 8)}@example.com`,
      password: "Password123!",
      role,
      ...extra,
    }),
  });
  const json = (await res.json()) as {
    success: boolean;
    data: { user: { id: string }; accessToken: string };
  };
  if (!json.success) throw new Error(`register ${role} failed`);
  return { userId: json.data.user.id, token: json.data.accessToken };
}

function connect(token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(SOCKET_URL, { auth: { token }, transports: ["websocket"], forceNew: true });
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", (err) => reject(err));
    setTimeout(() => reject(new Error("socket connect timeout")), 5000);
  });
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function futureSlotISO(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 3 + Math.floor(Math.random() * 20));
  d.setUTCHours(9 + Math.floor(Math.random() * 6), 0, 0, 0); // 09:00–14:00 UTC, on the hour
  return d.toISOString();
}

async function main() {
  const results: { name: string; pass: boolean }[] = [];
  const check = (name: string, pass: boolean) => {
    results.push({ name, pass });
    console.log(`${pass ? "✅" : "❌"} ${name}`);
  };

  // 1. Fixtures: a stylist (+ a service) and a customer, both via the real API.
  const stylist = await register("stylist", {
    phone: "+2348012345678",
    specialty: "Makeup",
    location: "Lekki, Lagos",
    priceFrom: 10000,
  });
  const stylistRow = await prisma.stylist.findUniqueOrThrow({ where: { userId: stylist.userId } });
  const service = await prisma.service.create({
    data: {
      stylistId: stylistRow.id,
      name: "Bridal Makeup",
      category: "Makeup",
      price: 25000,
      duration: 60,
      isActive: true,
    },
  });
  const customer = await register("user");
  const other = await register("user");

  // 2. Sockets: two customer "tabs" (A, B), the stylist (C), an unrelated user (D).
  const [a, b, c, d] = await Promise.all([
    connect(customer.token),
    connect(customer.token),
    connect(stylist.token),
    connect(other.token),
  ]);
  const capA = listen(a);
  const capB = listen(b);
  const capC = listen(c);
  const capD = listen(d);

  // Both customer tabs + the unrelated user opt in to the stylist's availability
  // stream (the stylist is auto-joined on connect by role).
  a.emit(SOCKET_EVENTS.AVAILABILITY_SUBSCRIBE, stylistRow.id);
  b.emit(SOCKET_EVENTS.AVAILABILITY_SUBSCRIBE, stylistRow.id);
  d.emit(SOCKET_EVENTS.AVAILABILITY_SUBSCRIBE, stylistRow.id);
  await wait(300);

  // 3. Customer creates a booking → slot:locked broadcast to availability watchers.
  const booking = await api("/bookings", customer.token, "POST", {
    stylistId: stylistRow.id,
    serviceId: service.id,
    startTime: futureSlotISO(),
    idempotencyKey: `verify-${stamp}-${Math.random().toString(36).slice(2)}`,
  });
  const bookingId = (booking as { id: string }).id;
  await wait(500);

  check("both customer tabs receive slot:locked", capA.slotLocked.length === 1 && capB.slotLocked.length === 1);
  check("stylist receives slot:locked", capC.slotLocked.length === 1);

  // 4. Customer cancels → booking:cancelled to the customer (both tabs) + stylist,
  //    slot:released to availability watchers.
  await api(`/bookings/${bookingId}/cancel`, customer.token, "PATCH", { reason: "Verifying live updates" });
  await wait(600);

  check("BOTH customer tabs receive booking:cancelled live", capA.cancelled.length === 1 && capB.cancelled.length === 1);
  check("stylist (correct recipient) receives booking:cancelled", capC.cancelled.length === 1);
  check("unrelated user does NOT receive booking:cancelled", capD.cancelled.length === 0);
  check("availability watchers receive slot:released", capA.slotReleased.length === 1 && capC.slotReleased.length === 1);
  check(
    "cancelled payload shape is correct",
    (capA.cancelled[0] as { bookingId?: string; status?: string })?.bookingId === bookingId &&
      (capA.cancelled[0] as { status?: string })?.status === "CANCELLED",
  );

  [a, b, c, d].forEach((s) => s.close());
  await prisma.$disconnect();

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n${passed}/${results.length} checks passed`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((err: unknown) => {
  console.error("verify-realtime crashed:", err);
  process.exit(1);
});
