'use client';

import { useState, useEffect } from 'react';

export default function PushManagerButton() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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
      await fetch('/api/push/subscribe', {
        method: 'POST',
        body: JSON.stringify(sub),
        headers: {
          'Content-Type': 'application/json',
        },
      });

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
      await subscription.unsubscribe();
      
      // Optional: Send unsubscription info to the backend to remove it
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ endpoint: subscription.endpoint }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

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

  return (
    <button onClick={handleClick} disabled={isLoading}>
      {isLoading ? 'Cargando...' : (isSubscribed ? 'Desactivar Notificaciones' : 'Activar Notificaciones')}
    </button>
  );
}