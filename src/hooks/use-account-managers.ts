import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { AccountManager } from '@/data/types';
import { AccountManagerFormValues } from '@/components/AccountManagerForm';

// Hook to fetch all account managers
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

// Hook to add a new account manager
export const useAddAccountManager = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (manager: AccountManagerFormValues) => {
      const { data, error } = await supabase.from('account_managers').insert([manager]).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast.success('Account manager added successfully!');
      queryClient.invalidateQueries({ queryKey: ['account_managers'] });
    },
    onError: (error) => {
      toast.error('Failed to add account manager.', { description: error.message });
    },
  });
};

// Hook to update an account manager
export const useUpdateAccountManager = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AccountManagerFormValues }) => {
      const { data: updatedData, error } = await supabase.from('account_managers').update(data).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return updatedData;
    },
    onSuccess: () => {
      toast.success('Account manager updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['account_managers'] });
    },
    onError: (error) => {
      toast.error('Failed to update account manager.', { description: error.message });
    },
  });
};

// Hook to delete an account manager
export const useDeleteAccountManager = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('account_managers').delete().eq('id', id);
      if (error) {
        throw new Error(`Failed to delete account manager: ${error.message}`);
      }
    },
    onSuccess: () => {
      toast.success('Account manager deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['account_managers'] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};