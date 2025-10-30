// src/config/firebase.ts

// NOTA: DEBES REEMPLAZAR ESTOS VALORES CON LA CONFIGURACIÓN REAL DE TU PROYECTO DE FIREBASE.
// En un entorno real, estos valores se cargarían desde variables de entorno.
export const firebaseConfig = {
  apiKey: "AIzaSyCDVNVyXwKFLRZSTFXgNkXJ0VK3j9jb4UQ",
  authDomain: "labflow-af22c.firebaseapp.com",
  projectId: "labflow-af22c",
  storageBucket: "labflow-af22c.firebasestorage.app",
  messagingSenderId: "969221893099",
  appId: "1:969221893099:web:f333a159c4c6e8b6e907ae",
  measurementId: "G-4XF1FBDNL2"
};

// El VAPID Key es necesario para la autenticación de notificaciones push.
// Genera esto en la configuración de FCM de tu proyecto de Firebase.
export const VAPID_KEY = "BEPxPZAQQh5qHVKQ3FeIfC3arZHDVNbE3xxQ_ci-mE98mNc9FrD8oLke-Of7KqLClFBjvV7_Ci33rIAkeX2esrA";