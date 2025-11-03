import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient }
from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// Importar el SDK de Google Gemini
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.18.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // 1. Verificar la sesión del usuario (opcional, pero buena práctica)
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      console.error('Edge Function: Authentication error', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid session' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Obtener la clave de API de Gemini de los secretos de Supabase
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: 'Server Error: GEMINI_API_KEY is missing in Supabase secrets.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    // 3. Parsear el cuerpo de la solicitud del frontend
    const { brand, catalogNumber, productName } = await req.json();

    // 4. Construir el prompt para la IA
    const prompt = `Busca información sobre el siguiente producto de laboratorio/científico:

MARCA: ${brand || 'No especificada'}
NÚMERO DE CATÁLOGO: ${catalogNumber || 'No especificado'}
NOMBRE DEL PRODUCTO (si se conoce): ${productName || 'No especificado'}

Tu tarea es buscar este producto específico en internet (sitios web de proveedores científicos, catálogos de laboratorio, etc.) y extraer la siguiente información:

1. **Nombre completo del producto**: El nombre oficial y completo del producto tal como aparece en el catálogo del fabricante.
2. **Tamaño/formato del paquete**: Información crucial sobre el contenido del paquete (ej: "100 tubos/paquete", "500 ml", "50 reacciones", "1 kit", "25 g"). Sé específico sobre las unidades y cantidad.
3. **Precio estimado**: Precio aproximado del producto en EUROS (€). Si encuentras el precio en otra moneda, conviértelo a euros usando tasas de cambio actuales.
4. **URL del producto**: Un enlace directo y fiable a la página del producto (preferiblemente del fabricante o de un distribuidor oficial).
5. **Notas técnicas**: Información breve pero relevante como:
   - Especificaciones técnicas principales
   - Condiciones de almacenamiento recomendadas
   - Aplicaciones principales
   - Cualquier información crítica para el usuario

IMPORTANTE:
- Sé preciso y exacto. Solo devuelve información de la que estés seguro.
- Si no puedes encontrar algún dato específico, indica claramente "No disponible" o null.
- Prioriza fuentes oficiales (fabricante, distribuidores autorizados).
- El precio debe ser en EUROS.
- El tamaño del paquete es CRÍTICO - no lo omitas.

Si no encuentras información fiable sobre este producto, devuelve un objeto con los campos en null y una nota explicativa.
`;

    // 5. Definir el esquema JSON para la respuesta
    const jsonSchema = {
      "type": "object",
      "properties": {
        "product_name": { 
          "type": "string",
          "description": "Nombre completo oficial del producto"
        },
        "pack_size": { 
          "type": "string",
          "description": "Tamaño/formato del paquete con unidades"
        },
        "estimated_price": { 
          "type": "number",
          "description": "Precio estimado en euros"
        },
        "product_url": { 
          "type": "string",
          "description": "URL directa al producto"
        },
        "technical_notes": { 
          "type": "string",
          "description": "Notas técnicas y especificaciones relevantes"
        }
      },
      "required": ["product_name"]
    };

    // 6. Invocar la API de Gemini
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ functionDeclarations: [{
        name: "extract_product_info",
        description: "Extrae información de un producto de laboratorio.",
        parameters: jsonSchema,
      }]}],
    });

    const response = result.response;
    const functionCalls = response.functionCalls();

    if (functionCalls && functionCalls.length > 0) {
      const functionCall = functionCalls[0];

      if (functionCall && functionCall.name === "extract_product_info") {
        const productInfo = functionCall.args;
        console.log('Gemini Product Info:', productInfo);

        // 7. Formatear la respuesta al tipo ProductSearchResult
        const formattedResult = {
          product_name: productInfo.product_name || productName || 'No disponible',
          catalog_number: catalogNumber || 'No disponible',
          brand: brand || null,
          unit_price: productInfo.estimated_price || null,
          format: productInfo.pack_size || null,
          link: productInfo.product_url || null,
          source: 'AI',
          notes: productInfo.technical_notes || null,
        };

        return new Response(JSON.stringify(formattedResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      } else {
        console.warn('Gemini did not return the expected function call.');
        // Log adicional para ver el contenido de la respuesta cuando no hay la función esperada
        console.log('Gemini response content (no expected function call):', JSON.stringify(response.candidates?.[0]?.content?.parts));
        return new Response(JSON.stringify({ error: 'No se pudo extraer información del producto de la IA.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }
    } else {
      console.warn('Gemini did not return any function calls.');
      // Log adicional para ver el contenido de la respuesta cuando no hay ninguna función
      console.log('Gemini response content (no function calls at all):', JSON.stringify(response.candidates?.[0]?.content?.parts));
      return new Response(JSON.stringify({ error: 'No se pudo extraer información del producto de la IA.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

  } catch (error: any) {
    console.error('Unhandled error in ai-product-search Edge Function:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred in the Edge Function.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});