import { useQuery } from "@tanstack/react-query";
import { apiFetchAIProductInfo, apiFuzzySearchInternal } from "@/integrations/api";
import { InventoryItem, SupabaseRequestItem } from "@/data/types";

// Tipo de resultado unificado para el frontend
export interface ProductSearchResult {
  product_name: string;
  catalog_number: string;
  brand: string | null;
  unit_price: number | null;
  format: string | null;
  link: string | null;
  source: 'AI' | 'DB' | 'AI+DB';
  notes: string | null;
}

/**
 * Hook para buscar información de productos usando AI (Gemini) con fallback a la base de datos (fuzzy search).
 * @param catalogNumber Número de catálogo (clave principal de búsqueda).
 * @param brand Marca (para refinar la búsqueda).
 * @param productName Nombre del producto (para búsqueda AI y fallback).
 */
export const useProductSearch = (
  catalogNumber: string | null,
  brand: string | null,
  productName: string | null
) => {
  // Habilitar la consulta solo si hay suficientes datos para una búsqueda significativa
  const isSearchEnabled = 
    (!!catalogNumber && !!brand) || 
    (!!productName && productName.length > 3) ||
    (!!catalogNumber) ||
    (!!brand);

  return useQuery<ProductSearchResult[], Error>({
    queryKey: ["productSearch", catalogNumber, brand, productName],
    queryFn: async () => {
      if (!isSearchEnabled) return [];

      // 1. Llamar a la función Edge de la IA
      const aiData = await apiFetchAIProductInfo({ brand, catalogNumber, productName });
      
      let result: ProductSearchResult = {
        product_name: aiData.product_name,
        catalog_number: aiData.catalog_number,
        brand: aiData.brand,
        unit_price: aiData.unit_price,
        format: aiData.format,
        link: aiData.link,
        source: aiData.source,
        notes: aiData.notes,
      };

      // 2. Determinar si se necesita un fallback a la base de datos
      const needsFallback = 
        result.product_name === "No disponible" ||
        !result.product_name ||
        !result.unit_price ||
        !result.link ||
        result.source === 'DB'; // Si la IA falló y devolvió el resultado vacío

      if (needsFallback) {
        // 3. Realizar búsqueda fuzzy interna
        // Construir un término de búsqueda que combine todos los campos disponibles
        const searchTermParts = [brand, catalogNumber, productName].filter(Boolean).map(s => s?.trim()).filter(Boolean);
        const searchTerm = searchTermParts.join(" ");
        
        if (searchTerm.length === 0) return []; // No hay nada que buscar

        const { inv, req } = await apiFuzzySearchInternal(searchTerm);
        
        // Combinar resultados de inventario y solicitudes, priorizando inventario
        const combinedResults: (InventoryItem | SupabaseRequestItem)[] = [
          ...inv, 
          ...req.filter(r => !inv.some(i => i.catalog_number === r.catalog_number && i.brand === r.brand))
        ];
        
        const best = combinedResults[0];

        if (best) {
          // 4. Fusionar resultados
          result = {
            // Priorizar el resultado de la IA si es válido, sino usar el de la DB
            product_name: result.product_name !== "No disponible" && result.product_name
              ? result.product_name
              : best.product_name,
            catalog_number: result.catalog_number !== "No disponible"
              ? result.catalog_number
              : best.catalog_number,
            brand: result.brand ?? best.brand,
            unit_price: result.unit_price ?? best.unit_price,
            format: result.format ?? best.format,
            link: result.link ?? best.link,
            source: result.source === "AI" ? "AI+DB" : "DB",
            notes: result.notes ?? null,
          };
        }
      }
      
      // Devolver el resultado fusionado como un array de un solo elemento para mantener la consistencia
      // Si el resultado final sigue siendo "No disponible", devolvemos un array vacío para no sugerir nada.
      if (result.product_name === "No disponible" && result.catalog_number === "No disponible") {
          return [];
      }
      
      return [result];
    },
    // Deshabilitar la consulta si no hay suficientes parámetros
    enabled: isSearchEnabled,
    // Mantener los datos por un tiempo corto ya que son volátiles (precios, etc.)
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
};