"use client";

import { useEffect, useState } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { firebaseConfig, VAPID_KEY } from '@/config/firebase';
import { useSession } from '@/components/SessionContextProvider';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// Inicializar Firebase (solo si no está inicializado)
const initializeFirebase = () => {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
};

// Hook para gestionar el token de FCM
export const useFCM = () => {
  const { session, profile } = useSession();
  const [token, setToken] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true);
    }
  }, []);

  useEffect(() => {
    if (!isSupported || !session) return;

    const app = initializeFirebase();
    const messaging = getMessaging(app);

    // 1. Solicitar permiso y obtener el token
    const requestPermissionAndGetToken = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
          
          if (currentToken) {
            setToken(currentToken);
            console.log("FCM Token obtained:", currentToken);
            
            // 2. Guardar el token en Supabase
            await saveTokenToSupabase(currentToken, session.user.id);
            
            // 3. Manejar mensajes en primer plano
            onMessage(messaging, (payload) => {
              console.log('Received foreground message:', payload);
              toast.info(payload.notification?.title || "Nueva Notificación", {
                description: payload.notification?.body,
                duration: 5000,
              });
            });
            
          } else {
            console.log('No registration token available. Request permission to generate one.');
          }
        } else {
          console.warn('Notification permission denied.');
        }
      } catch (err) {
        console.error('An error occurred while retrieving token:', err);
      }
    };

    requestPermissionAndGetToken();
    
    // Cleanup: Si el usuario cierra sesión, podríamos querer eliminar el token.
    // Esto se maneja mejor en el backend con un trigger de auth.
    
  }, [session, isSupported]);

  return { token, isSupported };
};

// Función para guardar el token en Supabase
const saveTokenToSupabase = async (fcmToken: string, userId: string) => {
  // Usaremos una tabla simple 'fcm_tokens' con (user_id, token)
  const { error } = await supabase
    .from('fcm_tokens')
    .upsert({ user_id: userId, token: fcmToken, last_used: new Date().toISOString() }, { onConflict: 'token' });

  if (error) {
    console.error('Error saving FCM token to Supabase:', error);
    // No mostramos un toast al usuario final, solo registramos el error.
  } else {
    console.log('FCM token saved/updated successfully in Supabase.');
  }
};