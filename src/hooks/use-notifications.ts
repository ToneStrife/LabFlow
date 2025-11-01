import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// Hook para enviar una notificación de prueba a través de la función Edge de FCM
export const useSendTestNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // 1. Obtener el token de FCM del usuario actual (desde la tabla fcm_tokens)
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("User not authenticated.");
      }

      const { data: tokenData, error: tokenError } = await supabase
        .from('fcm_tokens')
        .select('token')
        .eq('user_id', user.id)
        .order('last_used', { ascending: false })
        .limit(1)
        .single();

      if (tokenError || !tokenData) {
        throw new Error('FCM token not found for user. Please ensure you granted notification permission.');
      }
      
      const fcmToken = tokenData.token;

      // 2. Invocar la nueva función Edge genérica
      const { data, error } = await supabase.functions.invoke('send-notification', {
        method: 'POST',
        body: JSON.stringify({
          token: fcmToken,
          title: "🚀 Notificación de Prueba LabFlow",
          body: `¡La configuración de FCM v1 funciona! Enviada a las ${new Date().toLocaleTimeString()}.`,
          data: {
            test: 'true',
            userId: user.id,
          }
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
      
      return data;
    },
    onSuccess: () => {
      toast.success('Notificación de prueba enviada!', {
        description: 'Revisa tu dispositivo si has concedido permisos de notificación.',
      });
    },
    onError: (error) => {
      toast.error('Fallo al enviar la notificación de prueba.', {
        description: error.message,
      });
    },
  });
};