// public/firebase-messaging-sw.js
// Debe estar en /public para que se sirva como /<repo>/firebase-messaging-sw.js

// 1) Config pública (inyectada en build)
importScripts('./firebase-config.js');

// 2) SDKs compat (necesario para onBackgroundMessage en SW)
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// 3) Inicializar Firebase
const cfg = self.__FIREBASE_CONFIG__;
if (!cfg) {
  console.error('[SW] __FIREBASE_CONFIG__ no encontrado. ¿Generaste public/firebase-config.js?');
}
try {
  if (!firebase.apps.length) {
    firebase.initializeApp({
      apiKey: String(cfg.apiKey),
      authDomain: String(cfg.authDomain),
      projectId: String(cfg.projectId),
      storageBucket: String(cfg.storageBucket),
      messagingSenderId: String(cfg.messagingSenderId),
      appId: String(cfg.appId),
      measurementId: String(cfg.measurementId),
    });
  }
  console.log('[SW] Firebase inicializado');
} catch (e) {
  console.error('[SW] Error init Firebase:', e);
}

// 4) Utilidades de ruta y dedupe
const getBasePath = () => new URL(self.registration.scope).pathname; // p.ej. "/LabFlow/"
const resolveUrl = (maybeRelative) => new URL(maybeRelative || '.', self.registration.scope).toString();

self.__lastShown = { key: null, ts: 0 }; // dedupe suave por 1s

// 5) Mensajes en background: ***DATA-ONLY***
//    IMPORTANTE: usamos payload.data (NO payload.notification)
let messaging;
try {
  messaging = firebase.messaging();

  messaging.onBackgroundMessage(async ({ data }) => {
    // data esperada desde tu Edge Function:
    // { title, body, icon, url, tag, ... }
    console.log('[SW] Background DATA:', data);

    const basePath = getBasePath();

    const title = data?.title || 'Notificación';
    const body  = data?.body  || '';
    const icon  = data?.icon  ? resolveUrl(data.icon) : resolveUrl(basePath + 'favicon.png');
    const url   = data?.url   ? resolveUrl(data.url) : resolveUrl(basePath);

    // Dedupe: si llega duplicado en <1s con misma firma, ignora
    const now = Date.now();
    const key = `${title}|${body}`;
    if (self.__lastShown.key === key && (now - self.__lastShown.ts) < 1000) {
      console.warn('[SW] Dedupe por tiempo/clave:', key);
      return;
    }
    self.__lastShown = { key, ts: now };

    // Dedupe por tag: si ya existe una notificación con el mismo tag, no repitas
    const tag = data?.tag || key;
    const existing = await self.registration.getNotifications({ tag });
    if (existing.length) {
      console.warn('[SW] Dedupe por tag existente:', tag);
      return;
    }

    await self.registration.showNotification(title, {
      body,
      icon,
      tag,              // colapsa/evita duplicadas iguales
      renotify: false,  // no “revibre” si se reusa el tag
      data: { url },    // usado en el click
    });
  });
} catch (e) {
  console.error('[SW] Error init messaging:', e);
}

// 6) Click en notificación → abrir / enfocar
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || resolveUrl(getBasePath());

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        // si ya hay una pestaña, navega/focus
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
      // si no hay ventana, abre nueva
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

// 7) Tomar control rápido de pestañas (reemplazo de SWs antiguos)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));
