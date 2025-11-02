// Este archivo es el Service Worker de Firebase Cloud Messaging.
// Debe estar en el directorio raíz (public/) para tener el alcance correcto.

// Importar y configurar el SDK de Firebase (solo para Service Worker)
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Configuración de Firebase (Cargada desde variables de entorno inyectadas por Vite)
// NOTA: Vite reemplaza estas referencias con los valores de cadena reales durante la construcción.
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
// Solo inicializar si todos los campos críticos están presentes
if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId && firebaseConfig.messagingSenderId) {
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
} else {
    console.error('[firebase-messaging-sw.js] Firebase initialization skipped due to missing critical configuration values.');
}


// Manejar el evento de clic en la notificación (opcional)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Obtener el enlace de destino de los datos de la notificación si existe
  const clickAction = event.notification.data?.link || '/dashboard';
  
  // Determinar la ruta base dinámicamente
  const basePath = self.registration.scope; // Usar el scope del SW como base path
  const targetUrl = basePath + clickAction.replace(/^\//, ''); // Asegurar que la URL sea relativa a la base

  // Abrir la aplicación cuando se hace clic en la notificación
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        // Si la URL del cliente incluye la base, enfocarla y navegar a la URL de destino
        if (client.url.startsWith(basePath) && 'focus' in client) {
          if (client.url !== targetUrl) {
            return client.navigate(targetUrl).then(client => client.focus());
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        // Abrir la URL de destino si no se encuentra ninguna ventana
        return clients.openWindow(targetUrl);
      }
    })
  );
});