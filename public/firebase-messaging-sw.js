// Este archivo es el Service Worker de Firebase Cloud Messaging.
// Debe estar en el directorio raíz (public/) para tener el alcance correcto.

// Importar y configurar el SDK de Firebase (solo para Service Worker)
// Nota: Reemplaza 'YOUR_FIREBASE_CONFIG' con tu configuración real.
// En un entorno real, esta configuración se inyectaría aquí.
// Por ahora, usaremos un placeholder y asumiremos que el SDK de Firebase se carga
// a través de un script en index.html o que la configuración se pasa de otra manera.

// Importar el script de Firebase Messaging (versión 9 o superior)
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Configuración de Firebase (DEBE SER LA CONFIGURACIÓN REAL DE TU PROYECTO)
// Esta configuración debe ser accesible para el Service Worker.
// Por ahora, usamos un placeholder.
const firebaseConfig = {
  apiKey: "AIzaSyCDVNVyXwKFLRZSTFXgNkXJ0VK3j9jb4UQ",
  authDomain: "labflow-af22c.firebaseapp.com",
  projectId: "labflow-af22c",
  storageBucket: "labflow-af22c.firebasestorage.app",
  messagingSenderId: "969221893099", // CLAVE CRÍTICA PARA FCM
  appId: "1:969221893099:web:f333a159c4c6e8b6e907ae",
  measurementId: "G-4XF1FBDNL2"
};

// Inicializar Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Obtener la instancia de Messaging
const messaging = firebase.messaging();

// Manejar mensajes de fondo (cuando la app no está en primer plano)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/LabFlow/favicon.png', // Usar un icono de la PWA
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manejar el evento de clic en la notificación (opcional)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Abrir la aplicación cuando se hace clic en la notificación
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/LabFlow/') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/LabFlow/dashboard');
      }
    })
  );
});