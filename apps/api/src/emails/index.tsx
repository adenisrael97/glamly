import * as React from "react";
import { render } from "@react-email/render";
import { WelcomeEmail, type WelcomeEmailProps } from "./WelcomeEmail";
import {
  BookingConfirmedEmail,
  type BookingConfirmedEmailProps,
} from "./BookingConfirmedEmail";
import {
  BookingReminderEmail,
  type BookingReminderEmailProps,
} from "./BookingReminderEmail";
import {
  BookingCancelledEmail,
  type BookingCancelledEmailProps,
} from "./BookingCancelledEmail";
import {
  PasswordResetEmail,
  type PasswordResetEmailProps,
} from "./PasswordResetEmail";

// Render boundary: this is the ONLY module that turns a template component into
// a sendable email. Callers (notifications.service) stay JSX-free and just ask
// for a rendered { subject, html, text }. Keeping the subject next to its
// template avoids subject/body drift.

/** A fully-rendered email ready to hand to the Resend integration. */
export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

async function renderBoth(element: React.ReactElement): Promise<{ html: string; text: string }> {
  // react-email's render is async; produce HTML and a plain-text fallback so
  // text-only clients (and spam filters) get a readable version.
  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ]);
  return { html, text };
}

export async function renderWelcomeEmail(props: WelcomeEmailProps): Promise<RenderedEmail> {
  return { subject: "Welcome to Glamly", ...(await renderBoth(<WelcomeEmail {...props} />)) };
}

export async function renderBookingConfirmedEmail(
  props: BookingConfirmedEmailProps,
): Promise<RenderedEmail> {
  return {
    subject: `Booking confirmed — ${props.serviceName} with ${props.stylistName}`,
    ...(await renderBoth(<BookingConfirmedEmail {...props} />)),
  };
}

export async function renderBookingReminderEmail(
  props: BookingReminderEmailProps,
): Promise<RenderedEmail> {
  return {
    subject: `Reminder: ${props.serviceName} with ${props.stylistName}`,
    ...(await renderBoth(<BookingReminderEmail {...props} />)),
  };
}

export async function renderBookingCancelledEmail(
  props: BookingCancelledEmailProps,
): Promise<RenderedEmail> {
  return {
    subject: `Booking cancelled — ${props.serviceName}`,
    ...(await renderBoth(<BookingCancelledEmail {...props} />)),
  };
}

export async function renderPasswordResetEmail(
  props: PasswordResetEmailProps,
): Promise<RenderedEmail> {
  return {
    subject: "Reset your Glamly password",
    ...(await renderBoth(<PasswordResetEmail {...props} />)),
  };
}
