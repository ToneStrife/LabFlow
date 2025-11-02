"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/SessionContextProvider';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { registerPushToken, unregisterPushToken } from '@/utils/fcm-utils';
import { getMessaging, getToken } from 'firebase/messaging';
import { getApp } from 'firebase/app';
import { VAPID_KEY } from '@/config/firebase';

const PushManagerButton: React.FC = () => {
  const { session, loading: sessionLoading } = useSession();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentFCMToken, setCurrentFCMToken] = useState<string | null>(null);
  
  const isSupported = 'Notification' in window && 'serviceWorker' in navigator;

  useEffect(() => {
    if (!session || sessionLoading || !isSupported) {
      setIsLoading(false);
      return;
    }

    const checkSubscription = async () => {
      setIsLoading(true);
      try {
        const messaging = getMessaging(getApp());
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        
        if (token) {
          setCurrentFCMToken(token);
          // Verificar si el token existe en la base de datos (opcional, pero útil)
          // Por ahora, asumimos que si tenemos un token, estamos suscritos.
          setIsSubscribed(true);
        } else {
          setIsSubscribed(false);
        }
      } catch (e) {
        console.warn("Error checking FCM token:", e);
        setIsSubscribed(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscription();
  }, [session, sessionLoading, isSupported]);

  const handleToggleSubscription = async () => {
    if (!session?.user?.id) return;
    setIsLoading(true);

    if (isSubscribed && currentFCMToken) {
      // Desuscribir
      const success = await unregisterPushToken(currentFCMToken);
      if (success) {
        setIsSubscribed(false);
        setCurrentFCMToken(null);
      }
    } else {
      // Suscribir
      const token = await registerPushToken(session.user.id);
      if (token) {
        setIsSubscribed(true);
        setCurrentFCMToken(token);
      }
    }
    setIsLoading(false);
  };

  if (!isSupported) {
    return <p className="text-sm text-muted-foreground">Las notificaciones push no son compatibles con este navegador/dispositivo.</p>;
  }

  if (sessionLoading || isLoading) {
    return (
      <Button disabled className="w-full">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando Notificaciones...
      </Button>
    );
  }

  return (
    <Button 
      onClick={handleToggleSubscription} 
      disabled={isLoading} 
      className="w-full"
      variant={isSubscribed ? "destructive" : "default"}
    >
      {isSubscribed ? (
        <>
          <BellOff className="mr-2 h-4 w-4" /> Desactivar Notificaciones
        </>
      ) : (
        <>
          <Bell className="mr-2 h-4 w-4" /> Activar Notificaciones
        </>
      )}
    </Button>
  );
};

export default PushManagerButton;