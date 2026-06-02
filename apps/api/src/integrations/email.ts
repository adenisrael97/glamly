import { Resend } from "resend";
import { config } from "../config";
import { logger } from "../lib/logger";

// Email integration wrapper (CLAUDE.md §3): all Resend HTTP lives here so the
// notifications service depends on this interface, not on Resend's SDK. Swappable
// and mockable without touching business logic.
//
// Fail-soft design: when RESEND_API_KEY is unset (local dev / CI), we DO NOT send
// — we log that we would have, and report `skipped`. A missing key must never
// break the booking flow; delivery is best-effort and always off the hot path.

export type EmailSendResult =
  | { status: "sent"; id: string }
  | { status: "skipped"; reason: "no_api_key" }
  | { status: "failed"; error: string };

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// Instantiate once. `null` when no key is configured → the wrapper no-ops.
const resend = config.RESEND_API_KEY ? new Resend(config.RESEND_API_KEY) : null;

export const email = {
  /** True when a real API key is configured and delivery will be attempted. */
  isConfigured(): boolean {
    return resend !== null;
  },

  /**
   * Send one transactional email. Never throws — returns a tagged result the
   * caller can log. PII rule (§10): we log the message id and subject, never the
   * recipient address or body.
   */
  async send(params: SendEmailParams): Promise<EmailSendResult> {
    if (!resend) {
      logger.warn("Email skipped — RESEND_API_KEY not configured", {
        subject: params.subject,
      });
      return { status: "skipped", reason: "no_api_key" };
    }

    try {
      const { data, error } = await resend.emails.send({
        from: config.EMAIL_FROM,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });

      if (error) {
        logger.error("Resend rejected email", { subject: params.subject, error: error.message });
        return { status: "failed", error: error.message };
      }

      logger.info("Email sent", { subject: params.subject, id: data?.id });
      return { status: "sent", id: data?.id ?? "unknown" };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("Resend request failed", { subject: params.subject, error: message });
      return { status: "failed", error: message };
    }
  },
};
