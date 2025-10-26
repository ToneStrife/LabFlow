import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { SupabaseRequestItem } from "@/data/types";
import { ItemEditFormValues } from "@/components/request-details/RequestItemForm";

// Hook para actualizar un ítem de solicitud
export const useUpdateRequestItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ItemEditFormValues }) => {
      // Asegurar que los campos opcionales sean null si están vacíos
      const updateData = {
        ...data,
        brand: data.brand || null,
        format: data.format || null,
        link: data.link || null,
        notes: data.notes || null,
        unit_price: data.unit_price === undefined ? null : data.unit_price,
      };

      const { data: updatedItem, error } = await supabase
        .from('request_items')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return updatedItem;
    },
    onSuccess: (updatedItem) => {
      // Invalidar la caché de solicitudes para que se recargue la solicitud detallada
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      toast.success(`Artículo "${updatedItem.product_name}" actualizado exitosamente!`);
    },
    onError: (error) => {
      toast.error('Fallo al actualizar el artículo de solicitud.', { description: error.message });
    },
  });
};

// Hook para eliminar un ítem de solicitud
export const useDeleteRequestItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('request_items').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      toast.success('Artículo de solicitud eliminado exitosamente!');
    },
    onError: (error) => {
      toast.error('Fallo al eliminar el artículo de solicitud.', { description: error.message });
    },
  });
};