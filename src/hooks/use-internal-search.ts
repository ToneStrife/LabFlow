import { useQuery } from "@tanstack/react-query";
import { apiFuzzySearchInternal } from "@/integrations/api";
import { InventoryItem, SupabaseRequestItem } from "@/data/types";

// Tipo de resultado unificado para el frontend
export interface InternalSearchResult {
  product_name: string;
  catalog_number: string;
  brand: string | null;
  unit_price: number | null;
  format: string | null;
  link: string | null;
  source: 'DB';
}

/**
 * Hook para buscar productos en el inventario y solicitudes anteriores (fuzzy search).
 * @param searchTerm La cadena de búsqueda combinada (marca, catálogo, nombre).
 */
export const useInternalFuzzySearch = (searchTerm: string | null) => {
  const isSearchEnabled = !!searchTerm && searchTerm.length > 2;

  return useQuery<InternalSearchResult[], Error>({
    queryKey: ["internalFuzzySearch", searchTerm],
    queryFn: async () => {
      if (!isSearchEnabled) return [];

      const { inv, req } = await apiFuzzySearchInternal(searchTerm!);
      
      // Combinar resultados de inventario y solicitudes, priorizando inventario
      const combinedResults: (InventoryItem | SupabaseRequestItem)[] = [
        ...inv, 
        // Filtrar ítems de solicitud que ya están cubiertos por el inventario (misma marca/catálogo)
        ...req.filter(r => !inv.some(i => i.catalog_number === r.catalog_number && i.brand === r.brand))
      ];
      
      // Mapear a InternalSearchResult
      return combinedResults.slice(0, 5).map(item => ({
        product_name: item.product_name,
        catalog_number: item.catalog_number,
        brand: item.brand || null,
        unit_price: item.unit_price || null,
        format: item.format || null,
        link: item.link || null,
        source: 'DB',
      }));
    },
    enabled: isSearchEnabled,
    staleTime: 1000 * 60 * 10, // 10 minutos
  });
};