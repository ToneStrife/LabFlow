"use client";

import React, { useEffect } from "react";
import { initializeApp, getApps } from "firebase/app";
import { firebaseConfig, isFirebaseConfigured } from "@/config/firebase";
import { toast as sonnerToast } from "sonner";
import { getMessaging, onMessage, type Unsubscribe } from "firebase/messaging";
import { useNavigate } from "react-router-dom";

const FirebaseInitializer: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!isFirebaseConfigured()) {
      console.info(
        "[Firebase] Sin configuracion (VITE_FIREBASE_*). Las notificaciones push quedan desactivadas."
      );
      return;
    }

    let unsubscribe: Unsubscribe | undefined;
    let cancelled = false;

    const basePath = window.location.pathname.includes("/LabFlow/") ? "/LabFlow/" : "/";

    const start = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration(basePath);
        if (cancelled) return;

        const configWithSW = {
          ...firebaseConfig,
          serviceWorkerRegistration: registration,
        };

        const app = getApps().length ? getApps()[0]! : initializeApp(configWithSW);
        const messaging = getMessaging(app);

        unsubscribe = onMessage(messaging, (payload) => {
          console.log("Foreground message received:", payload);

          const notification = payload.notification;
          const data = payload.data;
          const link = data?.link;

          sonnerToast(notification?.title || "Notificación", {
            description: notification?.body || data?.body || "Mensaje recibido.",
            action: link
              ? {
                  label: "Ver",
                  onClick: () => navigate(link),
                }
              : undefined,
            duration: 10000,
          });
        });
      } catch (error: unknown) {
        if (cancelled) return;
        const err = error as { name?: string };
        const esErrorDeFirebase = String(err?.name || "").includes("FirebaseError");
        console.error(
          esErrorDeFirebase
            ? "Firebase messaging failed to start:"
            : "Error getting Service Worker registration:",
          error
        );
        sonnerToast.error(
          esErrorDeFirebase ? "Error de Firebase" : "Error de Service Worker",
          {
            description: esErrorDeFirebase
              ? "No se pudo arrancar la mensajeria. Revisa la configuracion de Firebase."
              : "Fallo al obtener el registro del Service Worker.",
          }
        );
      }
    };

    void start();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [navigate]);

  return null;
};

export default FirebaseInitializer;
