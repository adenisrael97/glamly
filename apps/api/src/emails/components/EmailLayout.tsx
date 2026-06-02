import * as React from "react";
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

// Shared shell for every transactional email so the brand header, footer, and
// base styling live in ONE place (CLAUDE.md §7). Email clients ignore external
// stylesheets and most modern CSS, so React Email's inline `style` objects are
// the correct, portable approach here — this is the documented exception to the
// frontend "no inline styles" rule (§4), which governs the Tailwind web app.

const main: React.CSSProperties = {
  backgroundColor: "#f6f5f8",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  margin: 0,
  padding: "24px 0",
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  margin: "0 auto",
  maxWidth: "480px",
  overflow: "hidden",
  padding: "32px",
};

const brand: React.CSSProperties = {
  color: "#b4126b",
  fontSize: "24px",
  fontWeight: 700,
  letterSpacing: "-0.5px",
  margin: "0 0 24px",
};

const footer: React.CSSProperties = {
  color: "#8a8a8a",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "16px 0 0",
};

const hr: React.CSSProperties = {
  borderColor: "#ececec",
  margin: "24px 0 0",
};

interface EmailLayoutProps {
  /** Inbox preview line (hidden in the body). */
  preview: string;
  children: React.ReactNode;
}

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>Glamly</Text>
          {children}
          <Hr style={hr} />
          <Section>
            <Text style={footer}>
              You're receiving this because you have a Glamly account. This is a
              transactional message about your bookings — we never sell your data.
            </Text>
            <Text style={footer}>© Glamly · Beauty & booking, made simple.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ─── Shared text styles reused by templates ─────────────────────────────────────

export const heading: React.CSSProperties = {
  color: "#1a1a1a",
  fontSize: "20px",
  fontWeight: 600,
  margin: "0 0 16px",
};

export const paragraph: React.CSSProperties = {
  color: "#3a3a3a",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

export const detailRow: React.CSSProperties = {
  color: "#3a3a3a",
  fontSize: "15px",
  lineHeight: "22px",
  margin: "0 0 6px",
};

export const detailLabel: React.CSSProperties = {
  color: "#8a8a8a",
  fontWeight: 600,
};

export const button: React.CSSProperties = {
  backgroundColor: "#b4126b",
  borderRadius: "8px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "15px",
  fontWeight: 600,
  margin: "8px 0 8px",
  padding: "12px 24px",
  textDecoration: "none",
};
