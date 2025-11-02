import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { UserNotificationPreferences, RequestStatus } from '@/data/types';

// Estados que el usuario puede elegir seguir
export const availableStatusNotifications: RequestStatus[] = [
  "Quote Requested",
  "PO Requested",
  "Ordered",
  "Received",
  "Denied",
  "Cancelled",
];

// Hook para obtener las preferencias de notificación de estado del usuario actual
export const useUserNotificationPreferences = (userId: string | undefined) => {
  return useQuery<UserNotificationPreferences | null, Error>({
    queryKey: ['userNotificationPreferences', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
        throw new Error(error.message);
      }
      
      // Si no se encuentra, devolver un objeto por defecto para evitar errores de null
      if (!data) {
        return {
          user_id: userId,
          notified_statuses: availableStatusNotifications, // Default to all
          created_at: new Date().toISOString(),
        };
      }

      return data;
    },
    enabled: !!userId,
  });
};

// Hook para actualizar las preferencias de notificación de estado
export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, statuses }: { userId: string; statuses: RequestStatus[] }) => {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .upsert({ user_id: userId, notified_statuses: statuses }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast.success('Preferencias de notificación actualizadas!');
      queryClient.invalidateQueries({ queryKey: ['userNotificationPreferences'] });
    },
    onError: (error) => {
      toast.error('Fallo al guardar las preferencias.', { description: error.message });
    },
  });
};