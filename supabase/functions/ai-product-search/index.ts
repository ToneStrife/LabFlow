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
    const prompt = `Actúa como un experto en compras de laboratorio con acceso a bases de datos de productos científicos y herramientas de búsqueda en línea. Tu objetivo es encontrar la información más precisa y completa posible para el siguiente producto.

Información de búsqueda:
- MARCA: ${brand || 'No especificada'}
- NÚMERO DE CATÁLOGO: ${catalogNumber || 'No especificado'}
- NOMBRE DEL PRODUCTO (si se conoce): ${productName || 'No especificado'}

Prioriza la búsqueda utilizando la MARCA y el NÚMERO DE CATÁLOGO como identificadores principales. Si el NOMBRE DEL PRODUCTO es muy específico, úsalo para refinar la búsqueda.

Extrae la siguiente información clave:

1.  **Nombre completo del producto**: El nombre oficial y completo del producto tal como aparece en el catálogo del fabricante o distribuidor.
2.  **Tamaño/formato del paquete**: Información crucial sobre el contenido del paquete (ej: "100 tubos/paquete", "500 ml", "50 reacciones", "1 kit", "25 g"). Sé específico sobre las unidades y cantidad.
3.  **Precio estimado**: Precio aproximado del producto en EUROS (€). Si encuentras el precio en otra moneda, conviértelo a euros usando tasas de cambio actuales. Si no encuentras un precio exacto, proporciona una estimación razonable o un rango si es posible, o indica 'No disponible' si no hay ninguna pista.
4.  **URL del producto**: Un enlace directo y fiable a la página del producto (preferiblemente del fabricante o de un distribuidor oficial).
5.  **Notas técnicas**: Información breve pero relevante como:
    -   Especificaciones técnicas principales
    -   Condiciones de almacenamiento recomendadas
    -   Aplicaciones principales
    -   Cualquier información crítica para el usuario

IMPORTANTE:
-   Sé preciso y exacto. Solo devuelve información de la que estés razonablemente seguro.
-   Si no puedes encontrar algún dato específico, indica claramente "No disponible" o null.
-   Prioriza fuentes oficiales (fabricante, distribuidores autorizados).
-   El precio debe ser en EUROS.
-   El tamaño del paquete es CRÍTICO - no lo omitas si lo encuentras.

Si no encuentras información fiable sobre este producto, devuelve un objeto JSON con los campos en null y una nota explicativa detallada sobre por qué no se encontró la información o qué se recomienda hacer.

Devuelve la respuesta como un objeto JSON que se ajuste al siguiente esquema:
{
  "product_name": "string",
  "pack_size": "string",
  "estimated_price": "number",
  "product_url": "string",
  "technical_notes": "string"
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