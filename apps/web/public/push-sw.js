/* Glamly push service worker (CLAUDE.md §5).
 * Minimal and dedicated to Web Push: it renders incoming notifications and routes
 * a click to the right page. Payloads match the api `PushMessage` shape
 * ({ title, body, url, tag }). When the full PWA app-shell service worker lands,
 * fold these handlers into it (one active SW per scope). */

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Glamly", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Glamly";
  const options = {
    body: payload.body || "",
    tag: payload.tag,
    data: { url: payload.url || "/" },
    icon: "/images/icon-192.png",
    badge: "/images/icon-192.png",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Focus an existing tab already on the target URL, else open a new one.
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
