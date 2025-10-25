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
      toast.success('Vendor added successfully!');
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: (error) => {
      toast.error('Failed to add vendor.', { description: error.message });
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
      toast.success('Vendor updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: (error) => {
      toast.error('Failed to update vendor.', { description: error.message });
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
        throw new Error(`Failed to delete vendor: ${error.message}`);
      }
    },
    onSuccess: () => {
      toast.success('Vendor deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};