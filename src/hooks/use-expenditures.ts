import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Expenditure } from '@/data/types';
import { apiGetExpenditures, apiAddExpenditure, apiUpdateExpenditure, apiDeleteExpenditure } from '@/integrations/api';

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
    },
    onError: (error) => {
      toast.error('Fallo al eliminar el gasto.', { description: error.message });
    },
  });
};