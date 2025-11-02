"use client";

import React, { useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseConfig } from '@/config/firebase';
import { toast as sonnerToast } from 'sonner'; // Usamos sonner para mostrar la notificación en el cliente
import { getMessaging, onMessage } from 'firebase/messaging';
import { useNavigate } from 'react-router-dom';

const FirebaseInitializer: React.FC = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!getApps().length) {
        try {
          // Determinar la ruta base dinámicamente
          const basePath = window.location.pathname.includes('/LabFlow/') ? '/LabFlow/' : '/';
          
          // 1. Obtener el registro del Service Worker en la ruta base
          navigator.serviceWorker.getRegistration(basePath).then(registration => {
            // 2. Clonar la configuración para añadir la ruta del Service Worker
            const configWithSW = {
              ...firebaseConfig,
              // Pasar el objeto de registro del Service Worker
              serviceWorkerRegistration: registration,
            };
            
            const app = initializeApp(configWithSW);
            console.log("Firebase App initialized successfully with SW registration.");
            
            // 3. Configurar el listener onMessage para mensajes en primer plano
            const messaging = getMessaging(app);
            
            const unsubscribe = onMessage(messaging, (payload) => {
                console.log('Foreground message received:', payload);
                
                const notification = payload.notification;
                const data = payload.data;
                const link = data?.link;

                sonnerToast(notification?.title || "Notificación", {
                    description: notification?.body || data?.body || "Mensaje recibido.",
                    action: link ? {
                        label: "Ver",
                        onClick: () => navigate(link),
                    } : undefined,
                    duration: 10000, // Mostrar por 10 segundos
                });
            });
            
            return () => unsubscribe();

          }).catch(error => {
            console.error("Error getting Service Worker registration:", error);
            sonnerToast.error("Error de Service Worker", { description: "Fallo al obtener el registro del Service Worker." });
          });
          
        } catch (error) {
          console.error("Firebase initialization failed:", error);
          sonnerToast.error("Error de Firebase", { description: "Fallo al inicializar la aplicación de Firebase." });
        }
      }
    }
  }, [navigate]);

  return null; // Este componente no renderiza nada visible
};

export default FirebaseInitializer;