import type { PushSubscriptionInput, VapidPublicKeyResult } from "@glamly/shared";
import { pushRepository } from "../repositories/push.repository";
import { push, type PushMessage } from "../integrations/push";
import { logger } from "../lib/logger";

// Business logic for web push: manage a user's subscriptions and fan a message
// out to all of their devices. Integration details (VAPID, transport) stay in
// integrations/push.ts.

export const pushService = {
  /** Public VAPID key for the client to build a subscription (null if disabled). */
  getVapidPublicKey(): VapidPublicKeyResult {
    return { publicKey: push.publicKey() };
  },

  /** Persist (or refresh) the caller's browser subscription. */
  async subscribe(userId: string, input: PushSubscriptionInput): Promise<void> {
    await pushRepository.upsert({
      userId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
    });
  },

  /** Remove the caller's subscription for the given endpoint. */
  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    await pushRepository.deleteByEndpoint(endpoint, userId);
  },

  /**
   * Push a message to every device a user has registered. Best-effort: each send
   * is independent, a dead endpoint is pruned, and one failure never blocks the
   * others. Returns silently — callers treat push as fire-and-forget.
   */
  async sendToUser(userId: string, message: PushMessage): Promise<void> {
    const subscriptions = await pushRepository.listByUserId(userId);
    if (subscriptions.length === 0) return;

    await Promise.all(
      subscriptions.map(async (sub) => {
        const result = await push.send(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          message,
        );
        if (result.status === "expired") {
          // Endpoint is dead — drop it so we stop trying and the table stays clean.
          await pushRepository.deleteById(sub.id).catch((err: unknown) => {
            logger.warn("Failed to prune expired push subscription", {
              error: err instanceof Error ? err.message : String(err),
            });
          });
        }
      }),
    );
  },
};
