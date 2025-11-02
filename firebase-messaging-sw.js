// public/firebase-messaging-sw.js
importScripts('./firebase-config.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const cfg = self.__FIREBASE_CONFIG__;

if (!firebase.apps.length) {
  firebase.initializeApp({
    apiKey: cfg.apiKey,
    authDomain: cfg.authDomain,
    projectId: cfg.projectId,
    storageBucket: cfg.storageBucket,
    messagingSenderId: cfg.messagingSenderId,
    appId: cfg.appId,
  });
}

const messaging = firebase.messaging();

const getBasePath = () => new URL(self.registration.scope).pathname;
const resolveUrl = (maybeRelative) => new URL(maybeRelative || '.', self.registration.scope).toString();

messaging.onBackgroundMessage(async ({ data }) => {
  console.log('[SW] DATA:', data);

  // ELIMINADO: payload.notification
  const title = data?.title || 'LabFlow';
  const body  = data?.body  || '';
  const icon  = data?.icon  ? resolveUrl(data.icon) : resolveUrl(getBasePath() + 'favicon.png');
  const url   = data?.url   ? resolveUrl(data.url)  : resolveUrl(getBasePath());
  const tag   = data?.tag   || 'labflow-single';

  // Cerrar cualquier notificación previa
  const existing = await self.registration.getNotifications({});
  existing.forEach(n => n.close());

  await self.registration.showNotification(title, {
    body,
    icon,
    tag,
    renotify: false,
    vibrate: [], // menos sugerencias del sistema
    data: { url }
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientsList) => {
        for (const client of clientsList) {
          if ('focus' in client) {
            const current = new URL(client.url);
            const target  = new URL(targetUrl);
            const samePath = (current.pathname + current.hash) === (target.pathname + target.hash);
            if (!samePath && 'navigate' in client) {
              return client.navigate(targetUrl).then(c => c.focus());
            }
            return client.focus();
          }
        }
        return clients.openWindow(targetUrl);
      })
  );
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));
