import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { AccountManager } from '@/data/types';
import { AccountManagerFormValues } from '@/components/AccountManagerForm';

export const useAccountManagers = () => {
  return useQuery<AccountManager[], Error>({
    queryKey: ['account_managers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('account_managers').select('*');
      if (error) throw new Error(error.message);
      return data || [];
    },
  });
};

export const useAddAccountManager = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (manager: AccountManagerFormValues) => {
      const { data, error } = await supabase.from('account_managers').insert([manager]).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast.success('Gerente de cuenta añadido.');
      queryClient.invalidateQueries({ queryKey: ['account_managers'] });
    },
    onError: (error) => {
      toast.error('No se pudo añadir el gerente de cuenta.', { description: error.message });
    },
  });
};

export const useUpdateAccountManager = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AccountManagerFormValues }) => {
      const { data: updatedData, error } = await supabase.from('account_managers').update(data).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return updatedData;
    },
    onSuccess: () => {
      toast.success('Gerente de cuenta actualizado.');
      queryClient.invalidateQueries({ queryKey: ['account_managers'] });
    },
    onError: (error) => {
      toast.error('No se pudo actualizar el gerente de cuenta.', { description: error.message });
    },
  });
};

export const useDeleteAccountManager = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('account_managers').delete().eq('id', id);
      if (error) {
        throw new Error(`No se pudo eliminar el gerente de cuenta: ${error.message}`);
      }
    },
    onSuccess: () => {
      toast.success('Gerente de cuenta eliminado.');
      queryClient.invalidateQueries({ queryKey: ['account_managers'] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};