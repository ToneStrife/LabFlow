import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.15.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Edge Function: Authentication error', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid session' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { catalogNumber, brand } = await req.json();

    if (!catalogNumber) {
      return new Response(JSON.stringify({ error: 'Missing required field: catalogNumber' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error: GEMINI_API_KEY is not set.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
    
    const prompt = `
      Busca información sobre el siguiente producto de laboratorio/científico:

      MARCA: ${brand}
      NÚMERO DE CATÁLOGO: ${catalogNumber}

      Tu tarea es buscar este producto específico en internet (sitios web de proveedores científicos, catálogos de laboratorio, etc.) y extraer la siguiente información en un formato JSON estricto.

      **Esquema JSON Requerido:**
      \`\`\`json
      {
        "product_name": "Nombre completo oficial del producto",
        "pack_size": "Tamaño/formato del paquete con unidades",
        "estimated_price": "Precio estimado en euros (número, no texto)",
        "product_url": "URL directa al producto",
        "technical_notes": "Notas técnicas y especificaciones relevantes"
      }
      \`\`\`

      **Instrucciones Detalladas para cada campo:**
      1.  **product_name**: El nombre oficial y completo del producto tal como aparece en el catálogo del fabricante.
      2.  **pack_size**: Información CRÍTICA sobre el contenido del paquete (ej: "100 tubos/paquete", "500 ml", "50 reacciones", "1 kit", "25 g"). Sé específico sobre las unidades y cantidad.
      3.  **estimated_price**: Precio aproximado del producto en EUROS (€). Si encuentras el precio en otra moneda, conviértelo a euros. Debe ser un número, no un texto (ej: 125.50, no "125,50 €").
      4.  **product_url**: Un enlace directo y fiable a la página del producto (preferiblemente del fabricante o de un distribuidor oficial).
      5.  **technical_notes**: Información breve pero relevante como condiciones de almacenamiento, aplicaciones principales, etc.

      **REGLAS IMPORTANTES:**
      - Tu respuesta DEBE ser únicamente el objeto JSON. No incluyas texto antes o después del JSON.
      - Sé preciso y exacto. Prioriza fuentes oficiales.
      - Si no puedes encontrar algún dato específico, el valor del campo debe ser \`null\`.
      - Si no encuentras información fiable sobre el producto, devuelve un objeto JSON donde todos los campos sean \`null\`.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let rawResponse = response.text();

    let aiResponse: any;
    try {
      // La IA debería devolver JSON directamente, pero por si acaso, limpiamos el markdown si existe.
      const jsonMatch = rawResponse.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        rawResponse = jsonMatch[1];
      }
      aiResponse = JSON.parse(rawResponse);
    } catch (jsonError) {
      console.error('Edge Function: Failed to parse Gemini JSON response:', jsonError, 'Raw Response:', rawResponse);
      return new Response(JSON.stringify({ error: 'AI response could not be parsed.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!aiResponse || !aiResponse.product_name) {
      return new Response(JSON.stringify({ error: `AI could not find reliable information for Catalog #: '${catalogNumber}' and Brand: '${brand || "N/A"}'.` }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Mapear la respuesta de la IA al formato que espera el frontend (camelCase)
    const productDetails = {
      productName: aiResponse.product_name,
      format: aiResponse.pack_size,
      unitPrice: aiResponse.estimated_price,
      link: aiResponse.product_url,
      notes: aiResponse.technical_notes,
      brand: brand,
      catalogNumber: catalogNumber,
      source: "AI Search (Gemini 2.5 Pro)"
    };

    console.log(`Edge Function: External search for catalog ${catalogNumber}, brand ${brand} found details.`);

    return new Response(JSON.stringify({ products: productDetails }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Edge Function: Unhandled error in search-product:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});