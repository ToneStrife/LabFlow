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
  source: 'Inventory' | 'Request Item' | 'AI'; // Añadido 'AI'
  notes?: string | null; // Añadido para las notas técnicas de la IA
}

// Definir tipos de datos devueltos por la consulta con score
interface InventoryFuzzyResult extends InventoryItem {
    score: number;
}

interface RequestItemFuzzyResult extends SupabaseRequestItem {
    score: number;
}

/**
 * Busca productos en el inventario y en artículos de solicitudes anteriores.
 * Si no encuentra resultados, intenta una búsqueda asistida por IA.
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

    // Fetch inventory items with similarity score
    const { data: invFuzzyData, error: invFuzzyError } = await supabase
      .from('inventory')
      .select(`*, score:similarity(product_name, '${productName}')`) // Seleccionar score explícitamente
      .gte('similarity(product_name, \'' + productName + '\')', similarityThreshold)
      .order('score', { ascending: false })
      .limit(5);

    if (invFuzzyError) console.error("Error fetching fuzzy inventory:", invFuzzyError);

    if (invFuzzyData && invFuzzyData.length > 0) {
      // Usar as unknown as para forzar el tipado y evitar el error de ParserError
      (invFuzzyData as unknown as InventoryFuzzyResult[]).forEach(item => { 
        if (!results.some(r => r.catalog_number === item.catalog_number && r.brand === item.brand)) {
          results.push({ 
            product_name: item.product_name,
            catalog_number: item.catalog_number,
            brand: item.brand,
            unit_price: item.unit_price,
            format: item.format,
            link: null, // Inventory items don't have a link field in the search result structure
            source: 'Inventory' 
          });
        }
      });
    }

    // Fetch request items with similarity score
    if (results.length < 5) {
        const { data: reqFuzzyData, error: reqFuzzyError } = await supabase
            .from('request_items')
            .select(`product_name, catalog_number, brand, unit_price, format, link, score:similarity(product_name, '${productName}')`) // Seleccionar score explícitamente
            .gte('similarity(product_name, \'' + productName + '\')', similarityThreshold)
            .order('score', { ascending: false })
            .limit(5);

        if (reqFuzzyError) console.error("Error fetching fuzzy request items:", reqFuzzyError);

        if (reqFuzzyData && reqFuzzyData.length > 0) {
            // Usar as unknown as para forzar el tipado y evitar el error de ParserError
            (reqFuzzyData as unknown as RequestItemFuzzyResult[]).forEach(item => { 
                if (!results.some(r => r.catalog_number === item.catalog_number && r.brand === item.brand)) {
                    results.push({ 
                        product_name: item.product_name,
                        catalog_number: item.catalog_number,
                        brand: item.brand,
                        unit_price: item.unit_price,
                        format: item.format,
                        link: item.link,
                        source: 'Request Item' 
                    });
                }
            });
        }
    }
  }

  // 3. Si no se encontraron resultados locales, intentar con la IA
  if (results.length === 0 && (catalogNumber || brand || productName)) {
    try {
      const { data, error } = await supabase.functions.invoke('ai-product-search', {
        method: 'POST',
        body: JSON.stringify({ brand, catalogNumber, productName }),
      });

      if (error) {
        console.error("Error invoking AI product search Edge Function:", error);
        // No lanzar error, solo no añadir resultados de IA
      } else if (data && data.product_name && data.product_name !== 'No disponible') {
        // Asegurarse de que la respuesta de la IA se ajuste a ProductSearchResult
        results.push({
          product_name: data.product_name,
          catalog_number: catalogNumber || 'AI-Generated', // Usar el de la búsqueda o un marcador
          brand: brand || null,
          unit_price: data.unit_price || null,
          format: data.format || null,
          link: data.link || null,
          source: 'AI',
          notes: data.notes || null,
        });
      }
    } catch (e) {
      console.error("Unexpected error calling AI product search:", e);
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
    (!!prodName && prodName.length > 3) ||
    (!!catNum && !brnd && !prodName) || // Permitir búsqueda AI solo con catálogo
    (!!brnd && !catNum && !prodName); // Permitir búsqueda AI solo con marca

  return useQuery<ProductSearchResult[], Error>({
    queryKey: ['productSearch', catNum, brnd, prodName],
    queryFn: () => fetchProductSearch(catNum, brnd, prodName),
    enabled: isSearchEnabled,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
};