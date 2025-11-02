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
const basePath = () => new URL(self.registration.scope).pathname;
const abs = (u) => new URL(u || '.', self.registration.scope).toString();

messaging.onBackgroundMessage(({ data }) => {
  const title = data?.title || 'LabFlow';
  const body  = data?.body  || '';
  const icon  = data?.icon  ? abs(data.icon) : abs(basePath() + 'favicon.png');
  const url   = data?.url   ? abs(data.url)  : abs(basePath());
  const tag   = data?.tag   || 'labflow';        // reemplaza, no acumula

  // No cerramos nada, no vibrate, no renotify
  return self.registration.showNotification(title, {
    body,
    icon,
    tag,
    renotify: false,
    data: { url }
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || abs(basePath());
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((list) => {
        for (const c of list) {
          if ('focus' in c) {
            const cur = new URL(c.url), tar = new URL(targetUrl);
            if (cur.pathname + cur.hash !== tar.pathname + tar.hash && 'navigate' in c) {
              return c.navigate(targetUrl).then(x => x.focus());
            }
            return c.focus();
          }
        }
        return clients.openWindow(targetUrl);
      })
  );
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));
