import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ShippingAddress, BillingAddress } from '@/data/types';

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