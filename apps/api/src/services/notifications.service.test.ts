import { describe, it, expect, vi, beforeEach } from "vitest";

// Unit test for the notification orchestrator. The cardinal concern (and the
// flagged review risk) is RECIPIENT CORRECTNESS: the customer must never receive
// the stylist's message and vice-versa. We mock every channel and assert exactly
// who each one is aimed at.

vi.mock("../repositories/bookings.repository", () => ({
  bookingsRepository: { findByIdForNotification: vi.fn() },
}));
vi.mock("../integrations/email", () => ({
  email: { send: vi.fn().mockResolvedValue({ status: "sent", id: "e1" }) },
}));
vi.mock("./push.service", () => ({
  pushService: { sendToUser: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("../realtime/io", () => ({
  emitBookingConfirmed: vi.fn(),
  emitBookingCancelled: vi.fn(),
  emitSlotLocked: vi.fn(),
  emitSlotReleased: vi.fn(),
}));
// Render functions echo their props so we can assert framing without rendering HTML.
vi.mock("../emails", () => ({
  renderWelcomeEmail: vi.fn(async (p) => ({ subject: "welcome", html: "h", text: "t", props: p })),
  renderBookingConfirmedEmail: vi.fn(async (p) => ({ subject: "confirmed", html: "h", text: "t", props: p })),
  renderBookingReminderEmail: vi.fn(async (p) => ({ subject: "reminder", html: "h", text: "t", props: p })),
  renderBookingCancelledEmail: vi.fn(async (p) => ({ subject: "cancelled", html: "h", text: "t", props: p })),
}));

import { notificationsService } from "./notifications.service";
import { bookingsRepository } from "../repositories/bookings.repository";
import { email } from "../integrations/email";
import { pushService } from "./push.service";
import {
  emitBookingConfirmed,
  emitBookingCancelled,
  emitSlotLocked,
  emitSlotReleased,
} from "../realtime/io";
import {
  renderBookingCancelledEmail,
  renderBookingConfirmedEmail,
} from "../emails";

const CUSTOMER = { id: "user-customer", name: "Ada Customer", email: "ada@example.com" };
const STYLIST_USER = { id: "user-stylist", name: "Bisi Stylist", email: "bisi@example.com" };

const bookingFixture = {
  id: "booking-1",
  startTime: new Date("2026-06-02T12:00:00.000Z"),
  endTime: new Date("2026-06-02T13:00:00.000Z"),
  totalAmount: 25000,
  cancellationReason: "Customer changed plans",
  service: { name: "Bridal Makeup" },
  user: CUSTOMER,
  stylist: { id: "stylist-1", location: "Lekki, Lagos", user: STYLIST_USER },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(bookingsRepository.findByIdForNotification).mockResolvedValue(
    bookingFixture as never,
  );
});

describe("sendBookingConfirmed", () => {
  it("emails ONLY the customer the confirmation", async () => {
    await notificationsService.sendBookingConfirmed("booking-1");

    expect(email.send).toHaveBeenCalledTimes(1);
    expect(vi.mocked(email.send).mock.calls[0]![0].to).toBe(CUSTOMER.email);

    // Confirmation copy is addressed to the customer, naming the stylist.
    const props = vi.mocked(renderBookingConfirmedEmail).mock.calls[0]![0];
    expect(props.customerName).toBe(CUSTOMER.name);
    expect(props.stylistName).toBe(STYLIST_USER.name);
  });

  it("pushes to BOTH parties at their own user ids", async () => {
    await notificationsService.sendBookingConfirmed("booking-1");

    const targets = vi.mocked(pushService.sendToUser).mock.calls.map((c) => c[0]);
    expect(targets).toContain(CUSTOMER.id);
    expect(targets).toContain(STYLIST_USER.id);
    expect(targets).toHaveLength(2);
  });

  it("emits a realtime booking:confirmed to both user rooms", async () => {
    await notificationsService.sendBookingConfirmed("booking-1");

    expect(emitBookingConfirmed).toHaveBeenCalledWith(
      { customerUserId: CUSTOMER.id, stylistUserId: STYLIST_USER.id },
      expect.objectContaining({ bookingId: "booking-1", status: "CONFIRMED" }),
    );
  });
});

describe("sendBookingCancelled", () => {
  it("sends role-correct emails: customer gets customer copy, stylist gets stylist copy", async () => {
    await notificationsService.sendBookingCancelled("booking-1");

    // Two cancellation emails, one to each address — never crossed.
    const recipients = vi.mocked(email.send).mock.calls.map((c) => c[0].to);
    expect(recipients).toContain(CUSTOMER.email);
    expect(recipients).toContain(STYLIST_USER.email);

    const renderCalls = vi.mocked(renderBookingCancelledEmail).mock.calls.map((c) => c[0]);
    const customerCopy = renderCalls.find((p) => p.audience === "customer");
    const stylistCopy = renderCalls.find((p) => p.audience === "stylist");

    // The customer's email greets the customer and names the stylist as counterpart.
    expect(customerCopy?.recipientName).toBe(CUSTOMER.name);
    expect(customerCopy?.counterpartName).toBe(STYLIST_USER.name);
    // The stylist's email greets the stylist and names the customer as counterpart.
    expect(stylistCopy?.recipientName).toBe(STYLIST_USER.name);
    expect(stylistCopy?.counterpartName).toBe(CUSTOMER.name);
  });

  it("releases the slot and notifies both rooms", async () => {
    await notificationsService.sendBookingCancelled("booking-1");

    expect(emitBookingCancelled).toHaveBeenCalledWith(
      { customerUserId: CUSTOMER.id, stylistUserId: STYLIST_USER.id },
      expect.objectContaining({ bookingId: "booking-1", status: "CANCELLED" }),
    );
    expect(emitSlotReleased).toHaveBeenCalledWith(
      expect.objectContaining({ stylistId: "stylist-1" }),
    );
  });
});

describe("notifySlotLocked", () => {
  it("emits slot:locked with ISO timestamps and the stylist id", () => {
    notificationsService.notifySlotLocked({
      stylistId: "stylist-1",
      startTime: new Date("2026-06-02T12:00:00.000Z"),
      endTime: new Date("2026-06-02T13:00:00.000Z"),
    });
    expect(emitSlotLocked).toHaveBeenCalledWith({
      stylistId: "stylist-1",
      startTime: "2026-06-02T12:00:00.000Z",
      endTime: "2026-06-02T13:00:00.000Z",
    });
  });
});

describe("missing booking", () => {
  it("no-ops (no sends) when the booking can't be found", async () => {
    vi.mocked(bookingsRepository.findByIdForNotification).mockResolvedValue(null);
    await notificationsService.sendBookingConfirmed("missing");
    expect(email.send).not.toHaveBeenCalled();
    expect(pushService.sendToUser).not.toHaveBeenCalled();
    expect(emitBookingConfirmed).not.toHaveBeenCalled();
  });
});
