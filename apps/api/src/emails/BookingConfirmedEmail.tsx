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

export interface BookingConfirmedEmailProps {
  customerName: string;
  stylistName: string;
  serviceName: string;
  /** Pre-formatted in Africa/Lagos by the render layer (templates stay dumb). */
  when: string;
  location: string;
  amount: string;
  manageUrl: string;
}

export function BookingConfirmedEmail({
  customerName,
  stylistName,
  serviceName,
  when,
  location,
  amount,
  manageUrl,
}: BookingConfirmedEmailProps) {
  return (
    <EmailLayout preview={`Your booking with ${stylistName} is confirmed`}>
      <Text style={heading}>Booking confirmed ✅</Text>
      <Text style={paragraph}>
        Hi {customerName}, your payment went through and your appointment is
        locked in. Here are the details:
      </Text>
      <Section>
        <Text style={detailRow}>
          <span style={detailLabel}>Service: </span>
          {serviceName}
        </Text>
        <Text style={detailRow}>
          <span style={detailLabel}>Stylist: </span>
          {stylistName}
        </Text>
        <Text style={detailRow}>
          <span style={detailLabel}>When: </span>
          {when}
        </Text>
        <Text style={detailRow}>
          <span style={detailLabel}>Where: </span>
          {location}
        </Text>
        <Text style={detailRow}>
          <span style={detailLabel}>Paid: </span>
          {amount}
        </Text>
      </Section>
      <Section>
        <Button href={manageUrl} style={button}>
          View booking
        </Button>
      </Section>
    </EmailLayout>
  );
}

export default BookingConfirmedEmail;
