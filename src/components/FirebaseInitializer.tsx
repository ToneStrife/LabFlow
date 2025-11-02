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
          initializeApp(firebaseConfig);
          console.log("Firebase App initialized successfully.");
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