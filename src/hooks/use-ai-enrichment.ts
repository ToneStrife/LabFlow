import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ProductQuery {
  brand: string;
  catalogNumber: string;
}

interface EnrichedProductDetails {
  product_name: string;
  catalog_number: string;
  unit_price: number | null;
  format: string | null;
  link: string | null;
  notes: string | null;
  brand: string;
}

// Hook para enriquecer detalles de productos usando la función Edge de Gemini
export const useEnrichProductDetails = () => {
  return useMutation<EnrichedProductDetails, Error, ProductQuery>({
    mutationFn: async ({ brand, catalogNumber }) => {
      const { data, error } = await supabase.functions.invoke('fetch-product-details', {
        method: 'POST',
        body: { brand, catalogNumber },
      });

      if (error) {
        console.error("Error invoking fetch-product-details:", error);
        throw new Error(error.message);
      }
      
      // La función Edge devuelve un objeto JSON con los detalles
      const result = data as EnrichedProductDetails;
      
      if (result.product_name === 'Producto No Encontrado') {
          throw new Error(`Producto no encontrado para la marca ${brand} y catálogo ${catalogNumber}.`);
      }
      
      return result;
    },
    onSuccess: () => {
      toast.success('Detalles del producto enriquecidos por IA.');
    },
    onError: (error) => {
      toast.error('Fallo al enriquecer por IA.', {
        description: error.message,
      });
    },
  });
};