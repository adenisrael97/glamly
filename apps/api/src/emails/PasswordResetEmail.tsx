import * as React from "react";
import { Button, Section, Text } from "@react-email/components";
import { EmailLayout, button, heading, paragraph } from "./components/EmailLayout";

export interface PasswordResetEmailProps {
  name: string;
  resetUrl: string;
  /** ISO string of token expiry — formatted in the email body. */
  expiresAt: string;
}

export function PasswordResetEmail({ name, resetUrl, expiresAt }: PasswordResetEmailProps) {
  const expiry = new Date(expiresAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <EmailLayout preview={`Reset your Glamly password, ${name}`}>
      <Text style={heading}>Reset your password</Text>
      <Text style={paragraph}>Hi {name},</Text>
      <Text style={paragraph}>
        We received a request to reset the password for your Glamly account. Click
        the button below to choose a new password. This link expires at{" "}
        <strong>{expiry}</strong> (1 hour from when it was sent).
      </Text>
      <Section>
        <Button href={resetUrl} style={button}>
          Reset my password
        </Button>
      </Section>
      <Text style={{ ...paragraph, fontSize: "13px", color: "#6b6b6b" }}>
        If you didn&apos;t request this, you can safely ignore this email — your
        password will not change, and this link will expire automatically.
      </Text>
      <Text style={{ ...paragraph, fontSize: "13px", color: "#6b6b6b" }}>
        For security, never share this link with anyone. Glamly staff will never
        ask you for it.
      </Text>
    </EmailLayout>
  );
}

export default PasswordResetEmail;
