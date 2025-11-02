import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface SendNotificationData {
  user_ids?: string[]; // Lista de IDs de usuario a los que enviar (si está vacío, envía a todos)
  title: string;
  body: string;
  link?: string; // URL para abrir al hacer clic en la notificación
  data?: Record<string, any>; // Datos adicionales para el Service Worker
}

// Hook para enviar una notificación dirigida o masiva
export const useSendNotification = () => {
  return useMutation({
    mutationFn: async (notificationData: SendNotificationData) => {
      // 1. Invocar la función Edge genérica
      const { data, error } = await supabase.functions.invoke('send-notification', {
        method: 'POST',
        body: JSON.stringify({
          user_ids: notificationData.user_ids,
          title: notificationData.title,
          body: notificationData.body,
          link: notificationData.link,
          data: notificationData.data,
        }),
      });

      if (error) {
        console.error("Error invoking send-notification:", error);
        let errorMessage = 'Fallo al invocar la función Edge.';
        if (data && typeof data === 'object' && 'error' in data) {
            errorMessage = (data as any).error;
        } else if (error.message) {
            errorMessage = error.message;
        }
        throw new Error(errorMessage);
      }
      
      // La función Edge devuelve un objeto con 'results'
      const results = (data as any).results || [];
      const failedCount = results.filter((r: any) => !r.success).length;
      
      if (failedCount > 0) {
          throw new Error(`Fallo al enviar a ${failedCount} de ${results.length} tokens.`);
      }
      
      return data;
    },
    onSuccess: (data, variables) => {
      const totalSent = (data as any).results?.length || 0;
      toast.success('Notificación enviada exitosamente!', {
        description: variables.user_ids && variables.user_ids.length > 0 
          ? `Enviada a ${variables.user_ids.length} usuarios (${totalSent} tokens).`
          : `Enviada a todos los usuarios (${totalSent} tokens).`,
      });
    },
    onError: (error) => {
      toast.error('Fallo al enviar la notificación.', {
        description: error.message,
      });
    },
  });
};

// Hook de prueba anterior (ahora usa el hook genérico)
export const useSendTestNotification = () => {
  const sendNotificationMutation = useSendNotification();
  
  return useMutation({
    mutationFn: async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("User not authenticated.");
      }
      
      // Enviar solo al usuario actual para la prueba
      return sendNotificationMutation.mutateAsync({
        user_ids: [user.id],
        title: "🚀 Notificación de Prueba LabFlow",
        body: `¡La configuración de FCM v1 funciona! Enviada a las ${new Date().toLocaleTimeString()}.`,
        data: {
          test: 'true',
          userId: user.id,
        }
      });
    },
    onSuccess: () => {
      // El toast ya se maneja en useSendNotification
    },
    onError: (error) => {
      // El toast ya se maneja en useSendNotification
    },
  });
};