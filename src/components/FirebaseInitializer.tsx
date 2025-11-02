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
          // 1. Obtener el registro del Service Worker en la ruta base
          navigator.serviceWorker.getRegistration('/LabFlow/').then(registration => {
            // 2. Clonar la configuración para añadir la ruta del Service Worker
            const configWithSW = {
              ...firebaseConfig,
              // Pasar el objeto de registro del Service Worker
              serviceWorkerRegistration: registration,
            };
            
            initializeApp(configWithSW);
            console.log("Firebase App initialized successfully with SW registration.");
          }).catch(error => {
            console.error("Error getting Service Worker registration:", error);
            toast.error("Error de Service Worker", { description: "Fallo al obtener el registro del Service Worker." });
          });
          
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