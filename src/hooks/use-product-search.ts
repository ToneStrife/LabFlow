import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase';
import { InventoryItem, SupabaseRequestItem } from "@/data/types";

// Definir el tipo de resultado de búsqueda unificado
export interface ProductSearchResult {
  product_name: string;
  catalog_number: string;
  brand: string | null;
  unit_price: number | null;
  format: string | null;
  link: string | null;
  source: 'Inventory' | 'Request Item';
}

/**
 * Busca productos en el inventario y en artículos de solicitudes anteriores.
 * @param catalogNumber Número de catálogo para búsqueda exacta.
 * @param brand Marca para búsqueda exacta.
 * @param productName Nombre del producto para búsqueda de similitud (fuzzy search).
 */
const fetchProductSearch = async (
  catalogNumber: string | null,
  brand: string | null,
  productName: string | null
): Promise<ProductSearchResult[]> => {
  const results: ProductSearchResult[] = [];

  // 1. Búsqueda por Catálogo y Marca (Búsqueda Exacta)
  if (catalogNumber && brand) {
    // Buscar en Inventory
    const { data: invData } = await supabase
      .from('inventory')
      .select('*')
      .eq('catalog_number', catalogNumber)
      .ilike('brand', brand)
      .limit(1);
    
    if (invData && invData.length > 0) {
      results.push({ ...invData[0], source: 'Inventory', link: null });
    }

    // Buscar en Request Items (para obtener precio/link de pedidos anteriores)
    const { data: reqData } = await supabase
      .from('request_items')
      .select('product_name, catalog_number, brand, unit_price, format, link')
      .eq('catalog_number', catalogNumber)
      .ilike('brand', brand)
      .order('id', { ascending: false }) // Obtener el más reciente
      .limit(1);

    if (reqData && reqData.length > 0) {
      // Solo añadir si no se encontró en el inventario o si la información es más completa
      if (results.length === 0 || !results.some(r => r.source === 'Inventory')) {
        results.push({ ...reqData[0], source: 'Request Item' });
      }
    }
  }

  // 2. Búsqueda por Similitud de Nombre (Fuzzy Search)
  // Solo ejecutar si no se encontraron resultados exactos y si hay un nombre de producto lo suficientemente largo
  if (productName && productName.length > 3 && results.length === 0) {
    const similarityThreshold = 0.3; // Umbral de similitud (0.3 es un buen punto de partida)

    // CORRECCIÓN: Usar nombres de argumentos genéricos para evitar el error de clave duplicada.
    // Asumimos que la función 'similarity(text, text)' toma la columna y el término de búsqueda.
    const similarityRpc = supabase.rpc('similarity', { 
        col_name: 'product_name', 
        search_term: productName 
    });

    // Buscar en Inventory por similitud
    const { data: invFuzzyData } = await supabase
      .from('inventory')
      .select('*')
      .limit(5)
      .order(similarityRpc, { ascending: false })
      .gte(similarityRpc, similarityThreshold);

    if (invFuzzyData && invFuzzyData.length > 0) {
      invFuzzyData.forEach(item => {
        if (!results.some(r => r.catalog_number === item.catalog_number && r.brand === item.brand)) {
          results.push({ ...item, source: 'Inventory', link: null });
        }
      });
    }

    // Buscar en Request Items por similitud (solo si no encontramos mucho en inventario)
    if (results.length < 5) {
        const { data: reqFuzzyData } = await supabase
            .from('request_items')
            .select('product_name, catalog_number, brand, unit_price, format, link')
            .limit(5)
            .order(similarityRpc, { ascending: false })
            .gte(similarityRpc, similarityThreshold);

        if (reqFuzzyData && reqFuzzyData.length > 0) {
            reqFuzzyData.forEach(item => {
                if (!results.some(r => r.catalog_number === item.catalog_number && r.brand === item.brand)) {
                    results.push({ ...item, source: 'Request Item' });
                }
            });
        }
    }
  }

  // Devolver solo los 5 mejores resultados únicos
  return results.slice(0, 5);
};

export const useProductSearch = (
  catalogNumber: string | null | undefined,
  brand: string | null | undefined,
  productName: string | null | undefined
) => {
  // Normalizar a string | null para la clave de consulta
  const catNum = catalogNumber || null;
  const brnd = brand || null;
  const prodName = productName || null;
  
  // Determinar si la búsqueda debe estar habilitada
  const isSearchEnabled = 
    (!!catNum && !!brnd) || 
    (!!prodName && prodName.length > 3); // Habilitar si hay nombre de producto con > 3 caracteres

  return useQuery<ProductSearchResult[], Error>({
    queryKey: ['productSearch', catNum, brnd, prodName],
    queryFn: () => fetchProductSearch(catNum, brnd, prodName),
    enabled: isSearchEnabled,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
};