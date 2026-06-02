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

export interface BookingReminderEmailProps {
  customerName: string;
  stylistName: string;
  serviceName: string;
  when: string;
  location: string;
  manageUrl: string;
}

export function BookingReminderEmail({
  customerName,
  stylistName,
  serviceName,
  when,
  location,
  manageUrl,
}: BookingReminderEmailProps) {
  return (
    <EmailLayout preview={`Reminder: your appointment with ${stylistName} is tomorrow`}>
      <Text style={heading}>See you soon ⏰</Text>
      <Text style={paragraph}>
        Hi {customerName}, this is a friendly reminder about your upcoming
        appointment:
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
      </Section>
      <Text style={paragraph}>
        Need to make a change? You can reschedule or cancel from your bookings.
      </Text>
      <Section>
        <Button href={manageUrl} style={button}>
          Manage booking
        </Button>
      </Section>
    </EmailLayout>
  );
}

export default BookingReminderEmail;
