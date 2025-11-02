// src/config/firebase.ts

// NOTA: Los valores se cargan desde variables de entorno de Vite (VITE_FIREBASE_*)
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// El VAPID Key es necesario para la autenticación de notificaciones push.
// Genera esto en la configuración de FCM de tu proyecto de Firebase.
export const VAPID_KEY = "BEPxPZAQQh5qHVKQ3FeIfC3arZHDVNbE3xxQ_ci-mE98mNc9FrD8oLke-Of7KqLClFBjvV7_Ci33rIAkeX2esrA";