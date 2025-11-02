self.addEventListener('push', function (event) {
  const data = event.data.json();
  console.log('New notification', data);

  const options = {
    body: data.body,
    icon: '/icon-192x192.png', // Asegúrate de tener un ícono en esta ruta
    badge: '/badge-72x72.png', // Y un badge en esta otra
    data: {
      url: data.url || '/', // URL a la que se navegará al hacer clic
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  
  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then(function (clientList) {
      // Si la ventana/pestaña ya está abierta, la enfoca
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no, abre una nueva ventana
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});