import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Groq from 'https://esm.sh/groq-sdk@0.4.0'; // Importar el SDK de Groq

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

    // 2. Obtener la clave de API de Groq de los secretos de Supabase
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      return new Response(JSON.stringify({ error: 'Server Error: GROQ_API_KEY is missing in Supabase secrets.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const groq = new Groq({ apiKey: groqApiKey });

    // 3. Parsear el cuerpo de la solicitud del frontend
    const { brand, catalogNumber, productName } = await req.json();

    // 4. Construir el prompt para la IA
    const prompt = `Actúa como un experto en búsqueda de productos de laboratorio. Tu objetivo es encontrar información **exacta y verificable** para el siguiente producto.

Información de búsqueda:
- MARCA: ${brand || 'No especificada'}
- NÚMERO DE CATÁLOGO: ${catalogNumber || 'No especificado'}
- NOMBRE DEL PRODUCTO (si se conoce): ${productName || 'No especificado'}

**Instrucciones CRÍTICAS:**
1.  **Prioridad de Búsqueda:** Utiliza la MARCA y el NÚMERO DE CATÁLOGO como identificadores principales para una búsqueda precisa. El NOMBRE DEL PRODUCTO es secundario y solo para refinar.
2.  **Precisión:** Solo devuelve información de la que estés **altamente seguro y que sea directamente verificable**.
3.  **No Inventar:** **Nunca inventes datos**, especialmente URLs, números de catálogo o precios. Si no encuentras un dato, indícalo como 'No disponible' o 'null'.

Extrae la siguiente información clave:

1.  **Nombre completo del producto**: El nombre oficial y completo del producto tal como aparece en el catálogo del fabricante o distribuidor. Si no lo encuentras con alta confianza, devuelve 'No disponible'.
2.  **Tamaño/formato del paquete**: Información crucial sobre el contenido del paquete (ej: "100 tubos/paquete", "500 ml", "50 reacciones", "1 kit", "25 g"). Sé específico sobre las unidades y cantidad. Si no lo encuentras, devuelve 'null'.
3.  **Precio estimado**: El precio exacto en EUROS (€) si lo encuentras y es directamente verificable. Si no hay un precio exacto y verificable, establece este campo como 'null'.
4.  **URL del producto**: Un enlace **directo y verificable** a la página del producto (preferiblemente del fabricante o de un distribuidor oficial). Si no encuentras una URL fiable, establece este campo como 'null'.
5.  **Notas técnicas**: Información breve pero relevante como:
    -   Especificaciones técnicas principales
    -   Condiciones de almacenamiento recomendadas
    -   Aplicaciones principales
    -   Cualquier información crítica para el usuario. Si no hay notas, establece este campo como 'null'.

Si no puedes encontrar información fiable para el producto solicitado (especialmente si el número de catálogo y la marca no coinciden con una entrada real), devuelve un objeto JSON donde `product_name` sea 'No disponible' y el resto de los campos sean 'null', con `technical_notes` conteniendo una explicación detallada de por qué no se encontró la información o qué se recomienda hacer.

Devuelve la respuesta como un objeto JSON que se ajuste al siguiente esquema:
{
  "product_name": "string | 'No disponible'",
  "pack_size": "string | null",
  "estimated_price": "number | null",
  "product_url": "string | null",
  "technical_notes": "string | null"
}
`;

    // 5. Definir el esquema JSON para la respuesta (ya está en el prompt)
    // const jsonSchema = { ... }; // No es necesario aquí, ya está en el prompt

    // 6. Invocar la API de Groq
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" }, // Solicitar respuesta en formato JSON
    });

    const groqResponseContent = chatCompletion.choices[0]?.message?.content;

    if (groqResponseContent) {
      const productInfo = JSON.parse(groqResponseContent);
      console.log('Groq Product Info:', productInfo);

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
      console.warn('Groq did not return any content.');
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