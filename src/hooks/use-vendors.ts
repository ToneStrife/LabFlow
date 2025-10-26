import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Vendor } from '@/data/types';
import { VendorFormValues } from '@/components/VendorForm';

// Hook to fetch all vendors
export const useVendors = () => {
  return useQuery<Vendor[], Error>({
    queryKey: ['vendors'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vendors').select('*');
      if (error) throw new Error(error.message);
      return data || [];
    },
  });
};

// Hook to add a new vendor
export const useAddVendor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vendor: VendorFormValues) => {
      const { data, error } = await supabase.from('vendors').insert([vendor]).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast.success('Proveedor añadido exitosamente!');
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: (error) => {
      toast.error('Fallo al añadir proveedor.', { description: error.message });
    },
  });
};

// Hook to update a vendor
export const useUpdateVendor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: VendorFormValues }) => {
      const { data: updatedData, error } = await supabase.from('vendors').update(data).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return updatedData;
    },
    onSuccess: () => {
      toast.success('Proveedor actualizado exitosamente!');
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: (error) => {
      toast.error('Fallo al actualizar proveedor.', { description: error.message });
    },
  });
};

// Hook to delete a vendor
export const useDeleteVendor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vendors').delete().eq('id', id);
      if (error) {
        throw new Error(`Fallo al eliminar proveedor: ${error.message}`);
      }
    },
    onSuccess: () => {
      toast.success('Proveedor eliminado exitosamente!');
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};