"use client";

import React, { useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseConfig } from '@/config/firebase';
import { toast } from 'sonner';

const FirebaseInitializer: React.FC = () => {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!getApps().length) {
        try {
          // Clonar la configuración para añadir la ruta del Service Worker
          const configWithSW = {
            ...firebaseConfig,
            // Especificar la ruta del Service Worker relativa a la raíz del dominio
            // En GitHub Pages, esto es /<repo-name>/firebase-messaging-sw.js
            serviceWorkerRegistration: navigator.serviceWorker.getRegistration('/LabFlow/firebase-messaging-sw.js'),
          };
          
          initializeApp(configWithSW);
          console.log("Firebase App initialized successfully with SW path.");
        } catch (error) {
          console.error("Firebase initialization failed:", error);
          toast.error("Error de Firebase", { description: "Fallo al inicializar la aplicación de Firebase." });
        }
      }
    }
  }, []);

  return null; // Este componente no renderiza nada visible
};

export default FirebaseInitializer;