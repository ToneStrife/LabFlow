import { getToken } from "firebase/messaging";
import { getApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging';
import { VAPID_KEY } from '@/config/firebase';
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// Inicializar Firebase Messaging (asumiendo que la app ya está inicializada en useFCM)
const getFirebaseMessaging = () => {
  try {
    const app = getApp();
    return getMessaging(app);
  } catch (e) {
    console.error("Firebase app not initialized:", e);
    return null;
  }
};

function isMobileUA() {
  const ua = navigator.userAgent || "";
  return /Android|iPhone|iPad|iPod/i.test(ua);
}

// Helper para obtener la ruta base dinámica
const getBasePath = () => window.location.pathname.includes('/LabFlow/') ? '/LabFlow/' : '/';


export async function registerPushToken(userId: string) {
  const messaging = getFirebaseMessaging();
  if (!messaging) {
    toast.error("Error de Firebase", { description: "El sistema de mensajería no está inicializado." });
    return null;
  }

  try {
    // 1) Pedir permiso
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      toast.warning("Permiso de notificación denegado.", { description: "No podremos enviarte notificaciones push." });
      return null;
    }

    // 2) Obtener token FCM, especificando el Service Worker
    const basePath = getBasePath();
    const swRegistration = await navigator.serviceWorker.getRegistration(basePath);
    
    if (!swRegistration) {
        toast.error("Error de Service Worker", { description: "No se pudo obtener el registro del Service Worker en la ruta esperada." });
        return null;
    }
    
    const token = await getToken(messaging, { 
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swRegistration, // Pasar el registro del SW
    });
    
    if (!token) {
      toast.error("Fallo al obtener token FCM.", { description: "Revisa el Service Worker, VAPID Key y la conexión HTTPS." });
      return null;
    }

    // 3) Subir/actualizar en la tabla fcm_tokens
    const payload = {
      user_id: userId, // Añadir user_id
      token,
      user_agent: navigator.userAgent,
      platform: navigator.platform,
      is_mobile: isMobileUA(),
      origin: location.origin,
      last_seen_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("fcm_tokens")
      .upsert(payload, { onConflict: "token" });

    if (error) {
      console.error("Error guardando token:", error);
      toast.error("Fallo al guardar el token de notificación.", { description: error.message });
    } else {
      console.log("FCM Token guardado OK:", token);
      toast.success("Notificaciones activadas.", { description: "Este dispositivo recibirá alertas push." });
    }

    return token;
  } catch (error: any) {
    console.error("Error en registerPushToken:", error);
    toast.error("Error al registrar notificaciones.", { description: error.message });
    return null;
  }
}

export async function unregisterPushToken(token: string) {
  const messaging = getFirebaseMessaging();
  if (!messaging) return;

  try {
    // 1. Eliminar el token de la base de datos (usando la función Edge)
    const { error: edgeError } = await supabase.functions.invoke('delete-fcm-token', { 
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    
    if (edgeError) {
        console.error("Error deleting token via Edge Function:", edgeError);
        // Continuar con la desuscripción local aunque la eliminación de la DB haya fallado
    }

    // 2. Desuscribir el Service Worker localmente
    const basePath = getBasePath();
    const swRegistration = await navigator.serviceWorker.getRegistration(basePath);
    if (swRegistration) {
        const subscription = await swRegistration.pushManager.getSubscription();
        if (subscription) {
            await subscription.unsubscribe();
        }
    }

    toast.info("Notificaciones desactivadas.");
    return true;
  } catch (error) {
    console.error("Error unregistering push token:", error);
    toast.error("Fallo al desactivar notificaciones.");
    return false;
  }
}