import * as React from "react";
import { Button, Section, Text } from "@react-email/components";
import { EmailLayout, button, heading, paragraph } from "./components/EmailLayout";

export interface WelcomeEmailProps {
  name: string;
  /** Drives the copy: stylists get storefront guidance, customers get discovery. */
  isStylist: boolean;
  ctaUrl: string;
}

export function WelcomeEmail({ name, isStylist, ctaUrl }: WelcomeEmailProps) {
  return (
    <EmailLayout preview={`Welcome to Glamly, ${name}!`}>
      <Text style={heading}>Welcome to Glamly, {name} 👋</Text>
      {isStylist ? (
        <Text style={paragraph}>
          Your stylist account is ready. Set up your storefront, list your
          services, and start taking bookings from clients near you.
        </Text>
      ) : (
        <Text style={paragraph}>
          Your account is ready. Discover talented stylists near you, book in a
          few taps, and pay securely — all in one place.
        </Text>
      )}
      <Section>
        <Button href={ctaUrl} style={button}>
          {isStylist ? "Set up my storefront" : "Find a stylist"}
        </Button>
      </Section>
    </EmailLayout>
  );
}

export default WelcomeEmail;
