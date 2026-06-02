import * as React from "react";
import { Button, Section, Text } from "@react-email/components";
import {
  EmailLayout,
  button,
  detailLabel,
  detailRow,
  heading,
  paragraph,
} from "./components/EmailLayout";

export interface BookingCancelledEmailProps {
  /** Who is reading THIS email — drives greeting and framing. */
  recipientName: string;
  /** "customer" = the person who booked; "stylist" = the provider. */
  audience: "customer" | "stylist";
  /** The other party's display name (stylist for the customer, vice-versa). */
  counterpartName: string;
  serviceName: string;
  when: string;
  reason: string | null;
  ctaUrl: string;
}

export function BookingCancelledEmail({
  recipientName,
  audience,
  counterpartName,
  serviceName,
  when,
  reason,
  ctaUrl,
}: BookingCancelledEmailProps) {
  const isStylist = audience === "stylist";
  return (
    <EmailLayout preview="A Glamly booking was cancelled">
      <Text style={heading}>Booking cancelled</Text>
      <Text style={paragraph}>
        Hi {recipientName},{" "}
        {isStylist
          ? `a booking on your storefront from ${counterpartName} has been cancelled.`
          : `your booking with ${counterpartName} has been cancelled.`}
      </Text>
      <Section>
        <Text style={detailRow}>
          <span style={detailLabel}>Service: </span>
          {serviceName}
        </Text>
        <Text style={detailRow}>
          <span style={detailLabel}>Was scheduled for: </span>
          {when}
        </Text>
        {reason ? (
          <Text style={detailRow}>
            <span style={detailLabel}>Reason: </span>
            {reason}
          </Text>
        ) : null}
      </Section>
      <Text style={paragraph}>
        {isStylist
          ? "That time slot is now free for other clients to book."
          : "No charge stands for a cancelled booking. You can book another time whenever you're ready."}
      </Text>
      <Section>
        <Button href={ctaUrl} style={button}>
          {isStylist ? "View my bookings" : "Book again"}
        </Button>
      </Section>
    </EmailLayout>
  );
}

export default BookingCancelledEmail;
