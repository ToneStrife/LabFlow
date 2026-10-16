// public/firebase-messaging-sw.js — v3 data-only (evita push dobles en móvil)
importScripts('./firebase-config.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const config = self.__FIREBASE_CONFIG__;
if (!config) {
  console.error('[firebase-messaging-sw.js] __FIREBASE_CONFIG__ not found.');
}

try {
  if (!firebase.apps.length) {
    firebase.initializeApp({
      apiKey: String(config.apiKey),
      authDomain: String(config.authDomain),
      projectId: String(config.projectId),
      storageBucket: String(config.storageBucket),
      messagingSenderId: String(config.messagingSenderId),
      appId: String(config.appId),
      measurementId: String(config.measurementId),
    });
  }
} catch (e) {
  console.error('[firebase-messaging-sw.js] Firebase init error:', e);
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

const getBasePath = () => new URL(self.registration.scope).pathname;

let messaging;
try {
  messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Background message:', payload);

    // Si aún llega un payload con "notification", FCM ya lo muestra: no repetir.
    if (payload.notification) {
      return;
    }

    const data = payload.data || {};
    const title = data.title || 'Notificación LabFlow';
    const body = data.body || '';
    const basePath = getBasePath();

    // Misma etiqueta para el mismo contenido = el SO sustituye en vez de apilar.
    const tag = data.tag || ('labflow:' + title + '|' + body).slice(0, 120);

    return self.registration.showNotification(title, {
      body,
      icon: basePath + 'favicon.png',
      data,
      tag,
      renotify: false,
    });
  });
} catch (e) {
  console.error('[firebase-messaging-sw.js] messaging init error:', e);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const clickAction = event.notification.data?.link || '/dashboard';
  const base = self.registration.scope;
  const targetUrl = new URL(clickAction, base).toString();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          const clientPath = new URL(client.url).pathname + new URL(client.url).hash;
          const targetPath = new URL(targetUrl).pathname + new URL(targetUrl).hash;
          if (clientPath !== targetPath && 'navigate' in client) {
            return client.navigate(targetUrl).then((c) => c.focus());
          }
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
