'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/src/integrations/supabase/client'; // Importamos el cliente que acabamos de verificar

export default function PushManagerButton() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Nuevo estado para la autenticación
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Helper function to convert VAPID key
  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  useEffect(() => {
    const checkAuthAndPush = async () => {
      // 1. Check Supabase Authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
        setIsLoading(false);
        return; // Stop if not logged in
      }

      // 2. Check Push Manager compatibility and registration
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        navigator.serviceWorker.register('/sw.js')
          .then(swReg => {
            console.log('Service Worker is registered', swReg);
            setRegistration(swReg);
            // Check for existing subscription
            swReg.pushManager.getSubscription().then(sub => {
              if (sub) {
                console.log('User IS subscribed.');
                setIsSubscribed(true);
                setSubscription(sub);
              }
              setIsLoading(false);
            });
          })
          .catch(error => {
            console.error('Service Worker Error', error);
            setIsLoading(false);
          });
      } else {
        console.warn('Push messaging is not supported');
        setIsLoading(false);
      }
    };

    checkAuthAndPush();
  }, []);

  const subscribeUser = async () => {
    if (!registration) {
      console.error('Service Worker registration not found.');
      return;
    }
    setIsLoading(true);
    const applicationServerKey = urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!);
    try {
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey,
      });
      console.log('User is subscribed:', sub);
      
      // Send subscription to the backend
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        body: JSON.stringify(sub),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription on server.');
      }

      setSubscription(sub);
      setIsSubscribed(true);
    } catch (error) {
      console.error('Failed to subscribe the user: ', error);
    }
    setIsLoading(false);
  };

  const unsubscribeUser = async () => {
    if (!subscription) return;
    setIsLoading(true);
    try {
      // Send unsubscription info to the backend to remove it
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ endpoint: subscription.endpoint }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete subscription on server.');
      }

      await subscription.unsubscribe();
      console.log('User is unsubscribed.');
      setSubscription(null);
      setIsSubscribed(false);
    } catch (error) {
      console.error('Error unsubscribing', error);
    }
    setIsLoading(false);
  };

  const handleClick = () => {
    if (isSubscribed) {
      unsubscribeUser();
    } else {
      subscribeUser();
    }
  };

  if (isLoading) {
    return <button disabled>Cargando...</button>;
  }

  if (!isLoggedIn) {
    return <p>Inicia sesión para activar las notificaciones.</p>;
  }

  return (
    <button onClick={handleClick} disabled={isLoading}>
      {isSubscribed ? 'Desactivar Notificaciones' : 'Activar Notificaciones'}
    </button>
  );
}