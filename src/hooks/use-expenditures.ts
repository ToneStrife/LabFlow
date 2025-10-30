import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Expenditure, SupabaseRequest } from '@/data/types';
import { apiGetExpenditures, apiAddExpenditure, apiUpdateExpenditure, apiDeleteExpenditure } from '@/integrations/api';
import { useRequests } from './use-requests'; // Importar useRequests

// Definir el tipo de datos del formulario (sin ID ni created_at)
export interface ExpenditureFormValues {
  project_id: string;
  amount: number;
  description: string;
  date_incurred: string; // YYYY-MM-DD format
  request_id: string | null;
}

// Hook para obtener todos los gastos
export const useExpenditures = () => {
  return useQuery<Expenditure[], Error>({
    queryKey: ['expenditures'],
    queryFn: apiGetExpenditures,
  });
};

// NUEVO HOOK: Obtener solicitudes recibidas que aún no tienen un gasto asociado
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

// Hook para añadir un nuevo gasto
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
      toast.success('Gasto registrado exitosamente!');
      queryClient.invalidateQueries({ queryKey: ['expenditures'] });
      queryClient.invalidateQueries({ queryKey: ['unaccountedReceivedRequests'] }); // Invalidar el nuevo hook
    },
    onError: (error) => {
      toast.error('Fallo al registrar el gasto.', { description: error.message });
    },
  });
};

// Hook para actualizar un gasto
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
      toast.success('Gasto actualizado exitosamente!');
      queryClient.invalidateQueries({ queryKey: ['expenditures'] });
      queryClient.invalidateQueries({ queryKey: ['unaccountedReceivedRequests'] }); // Invalidar el nuevo hook
    },
    onError: (error) => {
      toast.error('Fallo al actualizar el gasto.', { description: error.message });
    },
  });
};

// Hook para eliminar un gasto
export const useDeleteExpenditure = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiDeleteExpenditure(id);
    },
    onSuccess: () => {
      toast.success('Gasto eliminado exitosamente!');
      queryClient.invalidateQueries({ queryKey: ['expenditures'] });
      queryClient.invalidateQueries({ queryKey: ['unaccountedReceivedRequests'] }); // Invalidar el nuevo hook
    },
    onError: (error) => {
      toast.error('Fallo al eliminar el gasto.', { description: error.message });
    },
  });
};