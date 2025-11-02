// Este archivo es el Service Worker de Firebase Cloud Messaging.
// Debe estar en el directorio raíz (public/) para tener el alcance correcto.

// Importar y configurar el SDK de Firebase (solo para Service Worker)
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Configuración de Firebase (Cargada desde variables de entorno inyectadas por Vite)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID, // CLAVE CRÍTICA PARA FCM
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

// --- VERIFICACIÓN CRÍTICA ---
console.log('[firebase-messaging-sw.js] Initializing Firebase with config:', firebaseConfig);
// -----------------------------

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
    // Usar ruta relativa al Service Worker (que está en /LabFlow/)
    icon: './favicon.png', 
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
        // Si la URL del cliente incluye la base, enfocarla
        if (client.url.includes('/LabFlow/') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        // Abrir la URL base si no se encuentra ninguna ventana
        return clients.openWindow('/LabFlow/dashboard');
      }
    })
  );
});