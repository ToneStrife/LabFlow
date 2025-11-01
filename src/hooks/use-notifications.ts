import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// Hook para enviar una notificación de prueba a través de la función Edge de FCM
export const useSendTestNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('send-test-notification', {
        method: 'POST',
      });

      if (error) {
        console.error("Error invoking send-test-notification:", error);
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