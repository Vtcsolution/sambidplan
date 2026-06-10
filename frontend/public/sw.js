// public/sw.js — Sambid Notify Service Worker
// Handles incoming Web Push events and shows browser notifications.

self.addEventListener('install', (event) => {
  console.log('[SW] Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activated');
  event.waitUntil(self.clients.claim());
});

// ── Push event: show notification ─────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try { payload = event.data.json(); }
  catch { payload = { title: 'Sambid Notify', body: event.data.text(), data: {} }; }

  const title   = payload.title || 'Sambid Notify';
  const options = {
    body:    payload.body || 'You have a new notification.',
    icon:    payload.icon  || '/favicon.ico',
    badge:   payload.badge || '/favicon.ico',
    vibrate: [200, 100, 200],
    tag:     'sambid-notify-' + Date.now(),
    data:    payload.data || { url: '/' },
    actions: [
      { action: 'view',    title: 'View Now'  },
      { action: 'dismiss', title: 'Dismiss'   }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click: open or focus the app ─────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/opportunities';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
