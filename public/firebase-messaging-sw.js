// public/firebase-messaging-sw.js
// Debe estar en public/ para tener scope raíz

// 1) Config pública generada en build (ver más abajo)
importScripts('/firebase-config.js');

// 2) SDKs (compat para onBackgroundMessage)
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// 3) Tomar la config del objeto global inyectado por firebase-config.js
const config = self.__FIREBASE_CONFIG__;
if (!config) {
  console.error('[firebase-messaging-sw.js] __FIREBASE_CONFIG__ not found. Did you generate public/firebase-config.js at build time?');
}

// 4) Inicializar Firebase (para SW de FCM con senderId basta)
try {
  if (!firebase.apps.length) {
    // Mínimo necesario:
    // firebase.initializeApp({ messagingSenderId: String(config.messagingSenderId) });

    // O toda la config (también válido):
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
  console.log('[firebase-messaging-sw.js] Firebase initialized for FCM');
} catch (e) {
  console.error('[firebase-messaging-sw.js] Firebase init error:', e);
}

// 5) Instancia de Messaging y mensajes en background
let messaging;
try {
  messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Background message:', payload);

    const n = payload.notification || {};
    const notificationTitle = n.title || 'Notificación';
    const notificationOptions = {
      body: n.body || '',
      icon: n.icon || './favicon.png',
      image: n.image,
      data: payload.data || {},
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (e) {
  console.error('[firebase-messaging-sw.js] messaging init error:', e);
}

// 6) Click en notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const clickAction = event.notification.data?.link || '/dashboard';

  const base = self.registration.scope; // p.ej. "https://tu-dominio/"
  const targetUrl = new URL(clickAction, base).toString();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url !== targetUrl && 'navigate' in client) {
            return client.navigate(targetUrl).then(c => c.focus());
          }
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
