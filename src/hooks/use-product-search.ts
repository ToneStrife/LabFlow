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
    // Para usar RPC functions with .order and .gte, you need to call the RPC directly and then filter.
    // However, Postgrest doesn't directly support ordering by RPC results in a single query.
    // A common workaround is to fetch all, then filter/sort in client, or use a view/function on DB side.
    // For simplicity and to fix the compile error, we'll adjust the RPC call.
    // The schema shows `similarity(text, text)` which implies `similarity(column_value, search_term)`.
    // We need to select the similarity score and then filter/order.

    // Fetch inventory items with similarity score
    const { data: invFuzzyData, error: invFuzzyError } = await supabase
      .from('inventory')
      .select(`*, similarity(product_name, '${productName}') as score`)
      .gte('similarity(product_name, \'' + productName + '\')', similarityThreshold)
      .order('score', { ascending: false })
      .limit(5);

    if (invFuzzyError) console.error("Error fetching fuzzy inventory:", invFuzzyError);

    if (invFuzzyData && invFuzzyData.length > 0) {
      invFuzzyData.forEach(item => {
        if (!results.some(r => r.catalog_number === item.catalog_number && r.brand === item.brand)) {
          results.push({ ...item, source: 'Inventory', link: null });
        }
      });
    }

    // Fetch request items with similarity score
    if (results.length < 5) {
        const { data: reqFuzzyData, error: reqFuzzyError } = await supabase
            .from('request_items')
            .select(`product_name, catalog_number, brand, unit_price, format, link, similarity(product_name, '${productName}') as score`)
            .gte('similarity(product_name, \'' + productName + '\')', similarityThreshold)
            .order('score', { ascending: false })
            .limit(5);

        if (reqFuzzyError) console.error("Error fetching fuzzy request items:", reqFuzzyError);

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