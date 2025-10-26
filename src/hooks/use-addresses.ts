import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ShippingAddress, BillingAddress, Address } from '@/data/types';
import { AddressFormValues } from '@/components/AddressForm';
import { toast } from 'sonner';

// --- Fetch Hooks ---

// Hook para obtener todas las direcciones de envío
export const useShippingAddresses = () => {
  return useQuery<ShippingAddress[], Error>({
    queryKey: ['shippingAddresses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('shipping_addresses').select('*');
      if (error) throw new Error(error.message);
      return data || [];
    },
  });
};

// Hook para obtener todas las direcciones de facturación
export const useBillingAddresses = () => {
  return useQuery<BillingAddress[], Error>({
    queryKey: ['billingAddresses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('billing_addresses').select('*');
      if (error) throw new Error(error.message);
      return data || [];
    },
  });
};

// --- Mutation Hooks (Genéricos para Shipping/Billing) ---

const createAddressMutations = (tableName: 'shipping_addresses' | 'billing_addresses', queryKey: 'shippingAddresses' | 'billingAddresses') => {
  const useAddAddress = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (address: AddressFormValues) => {
        const { data, error } = await supabase.from(tableName).insert([address]).select().single();
        if (error) throw new Error(error.message);
        return data;
      },
      onSuccess: () => {
        toast.success(`New ${tableName.replace('_', ' ')} added successfully!`);
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      },
      onError: (error) => {
        toast.error(`Failed to add ${tableName.replace('_', ' ')}.`, { description: error.message });
      },
    });
  };

  const useUpdateAddress = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async ({ id, data }: { id: string; data: AddressFormValues }) => {
        const { data: updatedData, error } = await supabase.from(tableName).update(data).eq('id', id).select().single();
        if (error) throw new Error(error.message);
        return updatedData;
      },
      onSuccess: () => {
        toast.success(`${tableName.replace('_', ' ')} updated successfully!`);
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      },
      onError: (error) => {
        toast.error(`Failed to update ${tableName.replace('_', ' ')}.`, { description: error.message });
      },
    });
  };

  const useDeleteAddress = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from(tableName).delete().eq('id', id);
        if (error) {
          throw new Error(`Failed to delete ${tableName.replace('_', ' ')}: ${error.message}`);
        }
      },
      onSuccess: () => {
        toast.success(`${tableName.replace('_', ' ')} deleted successfully!`);
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  return { useAddAddress, useUpdateAddress, useDeleteAddress };
};

// Exportar hooks específicos para Shipping
export const { useAddAddress: useAddShippingAddress, useUpdateAddress: useUpdateShippingAddress, useDeleteAddress: useDeleteShippingAddress } = createAddressMutations('shipping_addresses', 'shippingAddresses');

// Exportar hooks específicos para Billing
export const { useAddAddress: useAddBillingAddress, useUpdateAddress: useUpdateBillingAddress, useDeleteAddress: useDeleteBillingAddress } = createAddressMutations('billing_addresses', 'billingAddresses');