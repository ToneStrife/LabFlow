import { useMutation } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const apiSendTestNotification = async (): Promise<void> => {
  // Asegurarse de que la sesión esté fresca antes de invocar la función Edge
  const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !session) {
    console.error("Error refreshing session before sending test notification:", refreshError);
    throw new Error("Failed to refresh session. Please log in again.");
  }
  
  // Llamar a la Edge Function
  const { data, error } = await supabase.functions.invoke('send-test-notification', {
    method: 'POST',
  });

  if (error) {
    console.error("Error invoking send-test-notification edge function:", error);
    let errorMessage = 'Fallo al enviar la notificación de prueba.';
    if (data && typeof data === 'object' && 'error' in data) {
        errorMessage = (data as any).error;
    } else if (error.message) {
        errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

export const useSendTestNotification = () => {
  return useMutation<void, Error>({
    mutationFn: apiSendTestNotification,
    onSuccess: () => {
      toast.success("Solicitud de notificación de prueba enviada.", {
        description: "Deberías recibir una notificación en breve si tienes los permisos activados.",
      });
    },
    onError: (error) => {
      toast.error("Fallo al enviar la notificación de prueba.", {
        description: error.message,
      });
    },
  });
};