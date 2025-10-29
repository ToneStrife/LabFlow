// src/config/firebase.ts

// NOTA: DEBES REEMPLAZAR ESTOS VALORES CON LA CONFIGURACIÓN REAL DE TU PROYECTO DE FIREBASE.
// En un entorno real, estos valores se cargarían desde variables de entorno.
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// El VAPID Key es necesario para la autenticación de notificaciones push.
// Genera esto en la configuración de FCM de tu proyecto de Firebase.
export const VAPID_KEY = "YOUR_VAPID_KEY";