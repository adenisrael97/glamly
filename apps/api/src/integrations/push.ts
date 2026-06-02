import webpush from "web-push";
import { config } from "../config";
import { logger } from "../lib/logger";

// Web Push integration wrapper (CLAUDE.md §3): all `web-push` calls + VAPID setup
// live here. Fail-soft like the email wrapper — when VAPID keys are unset, sends
// are skipped rather than throwing, so the booking flow is never coupled to push.

const configured = Boolean(config.VAPID_PUBLIC_KEY && config.VAPID_PRIVATE_KEY);

if (configured) {
  webpush.setVapidDetails(
    config.VAPID_SUBJECT,
    config.VAPID_PUBLIC_KEY!,
    config.VAPID_PRIVATE_KEY!,
  );
} else {
  logger.warn("Web push disabled — VAPID keys not configured");
}

export type PushSendResult =
  | { status: "sent" }
  // 404/410 from the push service: the subscription is dead and must be pruned.
  | { status: "expired" }
  | { status: "skipped"; reason: "not_configured" }
  | { status: "failed"; error: string };

/** A stored subscription's transport details. */
export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** The payload the service worker receives in its `push` event. */
export interface PushMessage {
  title: string;
  body: string;
  /** Deep link opened when the notification is clicked. */
  url?: string;
  /** Collapse key — a newer notification with the same tag replaces the old. */
  tag?: string;
}

export const push = {
  isConfigured(): boolean {
    return configured;
  },

  /** The VAPID public key the browser needs to create a subscription. */
  publicKey(): string | null {
    return config.VAPID_PUBLIC_KEY ?? null;
  },

  /**
   * Deliver one notification. Never throws — returns a tagged result. A 404/410
   * means the endpoint is gone (browser uninstalled / permission revoked); the
   * caller should delete that subscription.
   */
  async send(target: PushTarget, message: PushMessage): Promise<PushSendResult> {
    if (!configured) return { status: "skipped", reason: "not_configured" };

    try {
      await webpush.sendNotification(
        { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
        JSON.stringify(message),
      );
      return { status: "sent" };
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        return { status: "expired" };
      }
      const message = err instanceof Error ? err.message : String(err);
      logger.error("web-push send failed", { statusCode, error: message });
      return { status: "failed", error: message };
    }
  },
};
