// public/firebase-messaging-sw.js
// Debe estar en public/ para tener scope raíz

// 1) Config pública generada en build (ver más abajo)
importScripts('./firebase-config.js');

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

// Función auxiliar para obtener la ruta base (ej: /LabFlow/)
const getBasePath = () => {
    // self.registration.scope siempre termina en /
    const scope = self.registration.scope;
    // Si el scope es solo el origen (ej: https://domain.com/), la ruta base es '/'
    const url = new URL(scope);
    return url.pathname;
};

// 5) Instancia de Messaging y mensajes en background
let messaging;
try {
  messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Background message:', payload);

    const basePath = getBasePath();
    const n = payload.notification || {};
    const notificationTitle = n.title || 'Notificación';
    
    // Asegurar que el icono use la ruta base
    const iconPath = basePath + 'favicon.png'; 
    
    const notificationOptions = {
      body: n.body || '',
      icon: iconPath,
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
  
  // El link viene en payload.data.link (establecido en send-notification edge function)
  const clickAction = event.notification.data?.link || '/dashboard';

  const base = self.registration.scope; // p.ej. "https://tu-dominio/LabFlow/"
  
  // Si clickAction es una ruta relativa (ej: /dashboard), la URL se resuelve correctamente
  const targetUrl = new URL(clickAction, base).toString();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          // Si la URL del cliente actual es diferente a la URL de destino, navegamos
          // Nota: client.url puede incluir el hash (#/...) si estamos usando HashRouter
          const clientPath = new URL(client.url).pathname + new URL(client.url).hash;
          const targetPath = new URL(targetUrl).pathname + new URL(targetUrl).hash;
          
          if (clientPath !== targetPath && 'navigate' in client) {
            return client.navigate(targetUrl).then(c => c.focus());
          }
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});