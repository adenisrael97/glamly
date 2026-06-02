import { z } from "zod";

// Web Push contracts shared by web (subscribe in the service worker flow) and api
// (validate + persist). Mirrors the W3C PushSubscription JSON shape that
// `pushManager.subscribe().toJSON()` produces in the browser.

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  // Browsers include this; it's advisory and we don't persist it. Accepted so a
  // verbatim `subscription.toJSON()` payload validates without the client trimming.
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    // Client public key (base64url) used to encrypt the push payload.
    p256dh: z.string().min(1),
    // Auth secret (base64url) for the encryption envelope.
    auth: z.string().min(1),
  }),
});
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

/** Unsubscribe by endpoint — the stable identifier for a browser subscription. */
export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url(),
});
export type PushUnsubscribeInput = z.infer<typeof pushUnsubscribeSchema>;

/** Response of the VAPID public-key endpoint. `null` when push is not configured. */
export interface VapidPublicKeyResult {
  publicKey: string | null;
}
