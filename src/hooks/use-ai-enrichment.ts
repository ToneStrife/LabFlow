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

async function mensajeErrorFuncion(error: unknown, data: unknown): Promise<string> {
  if (data && typeof data === "object" && "error" in data) {
    const msg = (data as { error?: unknown }).error;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const body = await ctx.json();
      if (body?.error && typeof body.error === "string") return body.error;
    } catch {
      /* ignore */
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return "Error desconocido al enriquecer el producto.";
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
        console.error("Error invoking fetch-product-details:", error, data);
        throw new Error(await mensajeErrorFuncion(error, data));
      }

      if (data && typeof data === "object" && "error" in data && (data as { error?: string }).error) {
        throw new Error(String((data as { error: string }).error));
      }

      const result = data as EnrichedProductDetails;

      if (!result || result.product_name === 'Producto No Encontrado') {
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
