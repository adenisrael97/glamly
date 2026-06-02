import { config } from "../config";
import { logger } from "../lib/logger";
import { formatBookingTime, formatNaira } from "../lib/format";
import { email } from "../integrations/email";
import { pushService } from "./push.service";
import { bookingsRepository } from "../repositories/bookings.repository";
import {
  emitBookingCancelled,
  emitBookingConfirmed,
  emitSlotLocked,
  emitSlotReleased,
} from "../realtime/io";
import {
  renderBookingCancelledEmail,
  renderBookingConfirmedEmail,
  renderBookingReminderEmail,
  renderWelcomeEmail,
} from "../emails";

// Orchestrates user-facing notifications across all three channels — email
// (Resend), web push (VAPID), and realtime (Socket.io). This is the single seam
// that decides WHO is told WHAT; controllers/other services call it and never
// touch the channel integrations directly (CLAUDE.md §3).
//
// Every method is best-effort and self-contained: a notification failure is
// logged but never propagated, so it can never break the booking/auth flow it
// hangs off. Callers fire these AFTER their source transaction commits (§11).
//
// Recipient correctness is the cardinal rule here: the `customer` is the person
// who booked; the `stylist` is the provider's owning user. The two are loaded as
// distinct, explicitly-named objects so a message is never sent to the wrong party.

/** Normalised contacts + facts for a booking, both sides clearly separated. */
interface BookingContacts {
  id: string;
  startTime: Date;
  endTime: Date;
  serviceName: string;
  location: string;
  amount: string;
  when: string;
  cancellationReason: string | null;
  /** Stylist row id — keys the availability room / slot payloads. */
  stylistId: string;
  customer: { userId: string; name: string; email: string };
  stylist: { userId: string; name: string; email: string };
}

async function loadContacts(bookingId: string): Promise<BookingContacts | null> {
  const b = await bookingsRepository.findByIdForNotification(bookingId);
  if (!b) {
    logger.warn("Notification skipped — booking not found", { bookingId });
    return null;
  }
  return {
    id: b.id,
    startTime: b.startTime,
    endTime: b.endTime,
    serviceName: b.service?.name ?? "Multiple services",
    location: b.stylist.location,
    amount: formatNaira(b.totalAmount),
    when: formatBookingTime(b.startTime),
    cancellationReason: b.cancellationReason,
    stylistId: b.stylist.id,
    customer: { userId: b.user.id, name: b.user.name, email: b.user.email },
    stylist: {
      userId: b.stylist.user.id,
      name: b.stylist.user.name,
      email: b.stylist.user.email,
    },
  };
}

const customerBookingUrl = (id: string) => `${config.WEB_APP_URL}/bookings/${id}`;
const stylistDashboardUrl = () => `${config.WEB_APP_URL}/dashboard`;

export const notificationsService = {
  /** Greet a freshly-registered user. Fire-and-forget from the register flow. */
  async sendWelcome(user: { name: string; email: string; isStylist: boolean }): Promise<void> {
    try {
      const ctaUrl = user.isStylist
        ? stylistDashboardUrl()
        : `${config.WEB_APP_URL}/stylists`;
      const rendered = await renderWelcomeEmail({
        name: user.name,
        isStylist: user.isStylist,
        ctaUrl,
      });
      await email.send({ to: user.email, ...rendered });
    } catch (err) {
      logFailure("sendWelcome", err);
    }
  },

  /**
   * A booking moved to CONFIRMED (payment landed). The customer gets the
   * confirmation email; both parties get a push + a realtime event.
   */
  async sendBookingConfirmed(bookingId: string): Promise<void> {
    try {
      const c = await loadContacts(bookingId);
      if (!c) return;

      const manageUrl = customerBookingUrl(c.id);

      // Email → CUSTOMER only (confirmation copy is customer-facing).
      const rendered = await renderBookingConfirmedEmail({
        customerName: c.customer.name,
        stylistName: c.stylist.name,
        serviceName: c.serviceName,
        when: c.when,
        location: c.location,
        amount: c.amount,
        manageUrl,
      });
      await email.send({ to: c.customer.email, ...rendered });

      // Push → customer (their booking) and stylist (a new booking on their books).
      await Promise.all([
        pushService.sendToUser(c.customer.userId, {
          title: "Booking confirmed ✅",
          body: `${c.serviceName} with ${c.stylist.name} · ${c.when}`,
          url: manageUrl,
          tag: `booking-${c.id}`,
        }),
        pushService.sendToUser(c.stylist.userId, {
          title: "New booking 🎉",
          body: `${c.customer.name} booked ${c.serviceName} · ${c.when}`,
          url: stylistDashboardUrl(),
          tag: `booking-${c.id}`,
        }),
      ]);

      // Realtime → both parties' private rooms.
      emitBookingConfirmed(
        { customerUserId: c.customer.userId, stylistUserId: c.stylist.userId },
        {
          bookingId: c.id,
          status: "CONFIRMED",
          startTime: c.startTime.toISOString(),
          serviceName: c.serviceName,
          stylistName: c.stylist.name,
        },
      );
    } catch (err) {
      logFailure("sendBookingConfirmed", err);
    }
  },

  /**
   * A booking was cancelled. BOTH parties are notified with copy framed for their
   * role; the freed slot is broadcast to availability watchers.
   */
  async sendBookingCancelled(bookingId: string): Promise<void> {
    try {
      const c = await loadContacts(bookingId);
      if (!c) return;

      // Email → customer (their booking) AND stylist (a slot on their books),
      // each addressed to the right person with the right framing.
      const [customerEmail, stylistEmail] = await Promise.all([
        renderBookingCancelledEmail({
          recipientName: c.customer.name,
          audience: "customer",
          counterpartName: c.stylist.name,
          serviceName: c.serviceName,
          when: c.when,
          reason: c.cancellationReason,
          ctaUrl: `${config.WEB_APP_URL}/stylists`,
        }),
        renderBookingCancelledEmail({
          recipientName: c.stylist.name,
          audience: "stylist",
          counterpartName: c.customer.name,
          serviceName: c.serviceName,
          when: c.when,
          reason: c.cancellationReason,
          ctaUrl: stylistDashboardUrl(),
        }),
      ]);
      await Promise.all([
        email.send({ to: c.customer.email, ...customerEmail }),
        email.send({ to: c.stylist.email, ...stylistEmail }),
      ]);

      // Push → both parties.
      await Promise.all([
        pushService.sendToUser(c.customer.userId, {
          title: "Booking cancelled",
          body: `Your ${c.serviceName} with ${c.stylist.name} on ${c.when} was cancelled.`,
          url: `${config.WEB_APP_URL}/stylists`,
          tag: `booking-${c.id}`,
        }),
        pushService.sendToUser(c.stylist.userId, {
          title: "Booking cancelled",
          body: `${c.customer.name}'s ${c.serviceName} on ${c.when} was cancelled.`,
          url: stylistDashboardUrl(),
          tag: `booking-${c.id}`,
        }),
      ]);

      // Realtime → both private rooms, plus release the slot to availability watchers.
      emitBookingCancelled(
        { customerUserId: c.customer.userId, stylistUserId: c.stylist.userId },
        { bookingId: c.id, status: "CANCELLED", reason: c.cancellationReason },
      );
      emitSlotReleased({
        stylistId: c.stylistId,
        startTime: c.startTime.toISOString(),
        endTime: c.endTime.toISOString(),
      });
    } catch (err) {
      logFailure("sendBookingCancelled", err);
    }
  },

  /**
   * 24h reminder for an upcoming CONFIRMED booking (driven by the cron job).
   * Customer-only: email + push.
   */
  async sendBookingReminder(bookingId: string): Promise<void> {
    try {
      const c = await loadContacts(bookingId);
      if (!c) return;

      const manageUrl = customerBookingUrl(c.id);
      const rendered = await renderBookingReminderEmail({
        customerName: c.customer.name,
        stylistName: c.stylist.name,
        serviceName: c.serviceName,
        when: c.when,
        location: c.location,
        manageUrl,
      });
      await email.send({ to: c.customer.email, ...rendered });

      await pushService.sendToUser(c.customer.userId, {
        title: "Appointment reminder ⏰",
        body: `${c.serviceName} with ${c.stylist.name} · ${c.when}`,
        url: manageUrl,
        tag: `reminder-${c.id}`,
      });
    } catch (err) {
      logFailure("sendBookingReminder", err);
    }
  },

  /**
   * A slot was just taken by a new (PENDING) booking. Realtime-only — a freshly
   * held, unpaid slot isn't worth an email/push, but availability watchers should
   * see it grey out immediately. Takes the payload directly (no DB round-trip).
   */
  /** Notify a stylist their approval status changed — email only, fails-soft. */
  async sendStylistStatusEmail(
    stylistEmail: string,
    stylistName: string,
    status: string,
    reason?: string,
  ): Promise<void> {
    try {
      const subject =
        status === "APPROVED"
          ? "Your Glamly profile is approved! 🎉"
          : status === "REJECTED"
            ? "Your Glamly profile application update"
            : "Your Glamly profile has been suspended";

      const body =
        status === "APPROVED"
          ? `Hi ${stylistName}, your stylist profile has been approved. You can now accept bookings on Glamly!`
          : status === "REJECTED"
            ? `Hi ${stylistName}, we were unable to approve your profile at this time.${reason ? ` Reason: ${reason}` : ""}`
            : `Hi ${stylistName}, your profile has been temporarily suspended.${reason ? ` Reason: ${reason}` : ""}`;

      await email.send({
        to: stylistEmail,
        subject,
        html: `<p>${body}</p>`,
        text: body,
      });
    } catch (err) {
      logFailure("sendStylistStatusEmail", err);
    }
  },

  notifySlotLocked(payload: { stylistId: string; startTime: Date; endTime: Date }): void {
    try {
      emitSlotLocked({
        stylistId: payload.stylistId,
        startTime: payload.startTime.toISOString(),
        endTime: payload.endTime.toISOString(),
      });
    } catch (err) {
      logFailure("notifySlotLocked", err);
    }
  },
};

function logFailure(method: string, err: unknown): void {
  logger.error(`${method} failed`, {
    error: err instanceof Error ? err.message : String(err),
  });
}
