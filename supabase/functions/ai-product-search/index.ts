import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { GoogleGenAI } from 'https://esm.sh/@google/genai@0.16.0'; // Usar el SDK de Gemini

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
    // 1. Verificar la sesión del usuario
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

    // Inicializar el cliente de Gemini
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    // 3. Parsear el cuerpo de la solicitud del frontend
    const { brand, catalogNumber, productName } = await req.json();

    // 4. Construir el prompt y la configuración para la IA
    const prompt = `Actúa como un experto en búsqueda de productos de laboratorio. Tu objetivo es encontrar información **exacta y verificable** para el siguiente producto. Utiliza la herramienta de búsqueda web si es necesario para obtener información actualizada sobre precios y enlaces.

Información de búsqueda:
- MARCA: ${brand || 'No especificada'}
- NÚMERO DE CATÁLOGO: ${catalogNumber || 'No especificado'}
- NOMBRE DEL PRODUCTO (si se conoce): ${productName || 'No especificado'}

**Instrucciones CRÍTICAS:**
1.  **Identificación Principal:** Utiliza el **NÚMERO DE CATÁLOGO** y la **MARCA** como los identificadores más importantes.
2.  **Fuentes Confiables:** Prioriza la información de sitios web de fabricantes o distribuidores oficiales.
3.  **No Inventar:** Si un dato específico (precio, URL, formato) no se encuentra o no es verificable con alta confianza, establece ese campo como 'null'.
4.  **Respuesta JSON:** Devuelve la respuesta **SOLO** como un objeto JSON que se ajuste al esquema proporcionado.

Extrae la siguiente información clave:

1.  **Nombre completo del producto**: El nombre oficial y completo del producto. Si no puedes identificar el producto con alta confianza, devuelve 'No disponible'.
2.  **Tamaño/formato del paquete (pack_size)**: Información sobre el contenido del paquete (ej: "100 tubos/paquete", "500 ml"). Si no lo encuentras, devuelve 'null'.
3.  **Precio estimado (estimated_price)**: El precio exacto en EUROS (€) si lo encuentras y es directamente verificable. Si no hay un precio exacto y verificable, establece este campo como 'null'.
4.  **URL del producto (product_url)**: Un enlace **directo y verificable** a la página del producto. Si no encuentras una URL fiable, establece este campo como 'null'.
5.  **Notas técnicas (technical_notes)**: Información breve pero relevante (ej: condiciones de almacenamiento, aplicaciones). Si no hay notas, establece este campo como 'null'.

Si no puedes identificar el producto, devuelve un objeto JSON donde \`product_name\` sea 'No disponible' y el resto de los campos sean \`null\`.

ESQUEMA DE RESPUESTA JSON:
{
  "product_name": "string | 'No disponible'",
  "pack_size": "string | null",
  "estimated_price": "number | null",
  "product_url": "string | null",
  "technical_notes": "string | null"
}
`;

    // 5. Invocar la API de Gemini con la herramienta de búsqueda web activada
    const chatCompletion = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            product_name: { type: "string", description: "Nombre completo del producto o 'No disponible'." },
            pack_size: { type: "string", description: "Tamaño o formato del paquete, o null." },
            estimated_price: { type: "number", description: "Precio estimado en EUROS (€), o null." },
            product_url: { type: "string", description: "URL directa del producto, o null." },
            technical_notes: { type: "string", description: "Notas técnicas relevantes, o null." },
          },
          required: ["product_name", "pack_size", "estimated_price", "product_url", "technical_notes"],
        },
        // CRÍTICO: Activar la herramienta de búsqueda de Google
        tools: [{ googleSearch: {} }],
      },
    });

    const geminiResponseContent = chatCompletion.text;

    if (geminiResponseContent) {
      const productInfo = JSON.parse(geminiResponseContent);
      console.log('Gemini Product Info:', productInfo);

      // 6. Formatear la respuesta al tipo ProductSearchResult
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
      console.warn('Gemini did not return any content.');
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