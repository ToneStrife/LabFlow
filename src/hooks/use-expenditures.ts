import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Expenditure, SupabaseRequest } from '@/data/types';
import { apiGetExpenditures, apiAddExpenditure, apiUpdateExpenditure, apiDeleteExpenditure } from '@/integrations/api';
import { useRequests } from './use-requests';

export interface ExpenditureFormValues {
  project_id: string;
  amount: number;
  description: string;
  date_incurred: string;
  request_id: string | null;
}

export const useExpenditures = () => {
  return useQuery<Expenditure[], Error>({
    queryKey: ['expenditures'],
    queryFn: apiGetExpenditures,
  });
};

export const useUnaccountedReceivedRequests = () => {
  const { data: expenditures, isLoading: isLoadingExpenditures } = useExpenditures();
  const { data: requests, isLoading: isLoadingRequests } = useRequests();

  return useQuery<SupabaseRequest[], Error>({
    queryKey: ['unaccountedReceivedRequests', expenditures, requests],
    queryFn: async () => {
      if (isLoadingExpenditures || isLoadingRequests || !requests || !expenditures) return [];

      const accountedRequestIds = new Set(
        expenditures.map(exp => exp.request_id).filter((id): id is string => !!id)
      );

      return requests.filter(req => 
        req.status === 'Received' && 
        !accountedRequestIds.has(req.id) &&
        // Solo incluir si tiene ítems con precio unitario para calcular el costo
        req.items && 
        req.items.length > 0 &&
        req.items.every(item => item.unit_price !== null && item.unit_price !== undefined)
      );
    },
    enabled: !isLoadingExpenditures && !isLoadingRequests,
  });
};

export const useAddExpenditure = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (expenditure: ExpenditureFormValues) => {
      // Asegurar que request_id sea null si es una cadena vacía
      const dataToSubmit = {
        ...expenditure,
        request_id: expenditure.request_id || null,
      };
      return apiAddExpenditure(dataToSubmit);
    },
    onSuccess: () => {
      toast.success('Gasto registrado.');
      queryClient.invalidateQueries({ queryKey: ['expenditures'] });
      queryClient.invalidateQueries({ queryKey: ['unaccountedReceivedRequests'] }); // Invalidar el nuevo hook
    },
    onError: (error) => {
      toast.error('No se pudo registrar el gasto.', { description: error.message });
    },
  });
};

export const useUpdateExpenditure = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ExpenditureFormValues }) => {
      const dataToSubmit = {
        ...data,
        request_id: data.request_id || null,
      };
      return apiUpdateExpenditure(id, dataToSubmit);
    },
    onSuccess: () => {
      toast.success('Gasto actualizado.');
      queryClient.invalidateQueries({ queryKey: ['expenditures'] });
      queryClient.invalidateQueries({ queryKey: ['unaccountedReceivedRequests'] }); // Invalidar el nuevo hook
    },
    onError: (error) => {
      toast.error('No se pudo actualizar el gasto.', { description: error.message });
    },
  });
};

export const useDeleteExpenditure = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiDeleteExpenditure(id);
    },
    onSuccess: () => {
      toast.success('Gasto eliminado.');
      queryClient.invalidateQueries({ queryKey: ['expenditures'] });
      queryClient.invalidateQueries({ queryKey: ['unaccountedReceivedRequests'] }); // Invalidar el nuevo hook
    },
    onError: (error) => {
      toast.error('No se pudo eliminar el gasto.', { description: error.message });
    },
  });
};