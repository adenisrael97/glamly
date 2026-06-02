import { pushSubscriptionSchema } from "@glamly/shared";

// Web Push client helper (CLAUDE.md §5). Registers the push service worker, asks
// the browser to subscribe with the server's VAPID public key, and ships the
// subscription to the API. Browser-only — every entry point guards on support.
//
// Decoupled from auth: the caller passes the access token + API base, so this is
// ready to wire the moment the app exposes a real token.

const PUSH_SW_URL = "/push-sw.js";
const DEFAULT_API =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/?$/, "") ?? "http://localhost:4000/api/v1";

/** True only in a browser that can do service-worker push. */
export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// VAPID public keys are base64url; the Push API wants a Uint8Array.
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function authHeaders(token, json = false) {
  return {
    Authorization: `Bearer ${token}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

/**
 * Subscribe this browser to push and register it server-side.
 * @returns {Promise<PushSubscription|null>} the subscription, or null if push is
 *   unsupported / not configured on the server / permission was denied.
 */
export async function subscribeToPush({ token, apiUrl = DEFAULT_API }) {
  if (!isPushSupported()) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const registration = await navigator.serviceWorker.register(PUSH_SW_URL);
  await navigator.serviceWorker.ready;

  const keyRes = await fetch(`${apiUrl}/push/vapid-public-key`, {
    headers: authHeaders(token),
  });
  const keyJson = await keyRes.json();
  const publicKey = keyJson?.data?.publicKey;
  if (!publicKey) return null; // server has push disabled — nothing to do

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  // Validate against the shared schema before sending — same contract the API
  // enforces, so a malformed subscription is caught client-side too.
  const body = pushSubscriptionSchema.parse(subscription.toJSON());
  await fetch(`${apiUrl}/push/subscribe`, {
    method: "POST",
    headers: authHeaders(token, true),
    body: JSON.stringify(body),
  });

  return subscription;
}

/** Remove this browser's push subscription, server-side and locally. */
export async function unsubscribeFromPush({ token, apiUrl = DEFAULT_API }) {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration(PUSH_SW_URL);
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  await fetch(`${apiUrl}/push/subscribe`, {
    method: "DELETE",
    headers: authHeaders(token, true),
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  await subscription.unsubscribe();
}
