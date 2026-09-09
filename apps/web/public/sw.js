/* Service Worker for Smart Dispatch Web Push Notifications */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  let payload = {};
  try {
    payload = event.data.json();
  } catch (err) {
    payload = {
      title: "Smart Dispatch",
      message: event.data.text(),
    };
  }

  const title = payload.title || "Smart Dispatch Alert";
  const options = {
    body: payload.message || payload.body || "You have a new update.",
    icon: "/logo.webp",
    badge: "/logo.webp",
    data: {
      action_url: payload.actionUrl || payload.data?.actionUrl || "/admin",
      timestamp: Date.now(),
    },
    tag: payload.id || "smart-dispatch-notification",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.action_url || "/admin";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});
