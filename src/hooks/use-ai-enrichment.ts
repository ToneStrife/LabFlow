import { useMutation } from "@tanstack/react-query";
import { apiFetchAIProductInfo } from "@/integrations/api";
import { toast } from "sonner";

// Tipo de resultado de la IA
export interface AIEnrichmentResult {
  product_name: string;
  catalog_number: string;
  brand: string | null;
  unit_price: number | null;
  format: string | null;
  link: string | null;
  source: 'AI' | 'DB'; // 'DB' si la IA falló y devolvió el fallback
  notes: string | null;
}

interface AIEnrichmentParams {
  brand: string | null;
  catalogNumber: string | null;
  productName: string | null;
}

/**
 * Hook de mutación para solicitar enriquecimiento de datos de producto a la IA.
 */
export const useAIEnrichment = () => {
  return useMutation<AIEnrichmentResult, Error, AIEnrichmentParams>({
    mutationFn: async (params) => {
      const result = await apiFetchAIProductInfo(params);
      
      if (result.source === 'DB') {
        // Si la IA falló y devolvió el objeto de fallback (source: 'DB'), lanzamos un error
        // para que el onError del mutation lo capture y muestre el toast.
        throw new Error(result.notes || "La búsqueda por IA falló o no encontró datos.");
      }
      
      return result as AIEnrichmentResult;
    },
    onSuccess: (data) => {
      toast.success("Enriquecimiento por IA completado.", {
        description: `Datos de ${data.product_name} cargados.`,
      });
    },
    onError: (error) => {
      toast.error("Fallo en el Enriquecimiento por IA.", {
        description: error.message,
      });
    },
  });
};