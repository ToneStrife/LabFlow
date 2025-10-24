import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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

    const aiApiKey = Deno.env.get('AI_API_KEY');
    if (!aiApiKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error: AI_API_KEY is not set.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const systemInstruction = `
      Eres un asistente de IA experto en la búsqueda y extracción de información de productos científicos y de laboratorio. Tu tarea es encontrar información precisa sobre un producto basándote en su marca y número de catálogo.

      **Instrucciones Clave:**
      1.  **Prioriza la fuente oficial:** Siempre intenta encontrar la página del producto en el sitio web oficial del fabricante.
      2.  **Sé preciso:** Extrae los datos exactamente como aparecen. No inventes información.
      3.  **Formato JSON estricto:** Tu respuesta DEBE ser únicamente un objeto JSON válido con el siguiente esquema. No incluyas texto antes o después del JSON.

      **Esquema JSON Requerido:**
      {
        "product_name": "string | null",
        "pack_size": "string | null",
        "estimated_price": "number | null",
        "product_url": "string | null",
        "technical_notes": "string | null",
        "confidence_score": "number (0.0 a 1.0)"
      }

      **Definición de Campos:**
      - \`product_name\`: El nombre completo y oficial del producto.
      - \`pack_size\`: El formato o tamaño del empaque (ej: "500 mL", "100 µl", "25 reactions").
      - \`estimated_price\`: El precio de lista en la moneda que encuentres. Solo el número, sin símbolos. Si encuentras un rango, usa el promedio.
      - \`product_url\`: El enlace directo a la página del producto.
      - \`technical_notes\`: Un resumen breve de notas técnicas o una descripción del producto.
      - \`confidence_score\`: Tu nivel de confianza (de 0.0 a 1.0) de que la información encontrada es correcta y pertenece al producto exacto solicitado. 1.0 es certeza absoluta.

      **Si no encuentras el producto o no estás seguro, devuelve un JSON con todos los campos en \`null\` y un \`confidence_score\` bajo (ej: 0.1).**
    `;

    const userPrompt = `
      Por favor, busca y extrae la información para el siguiente producto:
      - MARCA: ${brand}
      - NÚMERO DE CATÁLOGO: ${catalogNumber}
    `;

    const combinedPrompt = `${systemInstruction}\n\n${userPrompt}`;

    const response = await fetch("https://api.aimlapi.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${aiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "google/gemini-1.5-flash",
        "response_format": { "type": "json_object" },
        "messages": [
          { "role": "user", "content": combinedPrompt }
        ]
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Edge Function: AIMLAPI API error:', errorBody);
      return new Response(JSON.stringify({ error: `AIMLAPI API error: ${response.statusText}` }), { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await response.json();
    const rawResponse = data.choices[0].message.content;
    
    console.log('Edge Function: Raw AI Response:', rawResponse); // Registro añadido para depuración

    let aiResponse: any;
    try {
      aiResponse = JSON.parse(rawResponse);
    } catch (jsonError) {
      console.error('Edge Function: Failed to parse AI JSON response:', jsonError, 'Raw Response:', rawResponse);
      return new Response(JSON.stringify({ error: 'AI response could not be parsed.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!aiResponse || !aiResponse.product_name || (aiResponse.confidence_score && aiResponse.confidence_score < 0.5)) {
      const confidence = aiResponse.confidence_score || 'N/A';
      return new Response(JSON.stringify({ error: `AI could not find reliable information (Confidence: ${confidence}) for Catalog #: '${catalogNumber}' and Brand: '${brand || "N/A"}'.` }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const productDetails = {
      productName: aiResponse.product_name,
      format: aiResponse.pack_size,
      unitPrice: aiResponse.estimated_price,
      link: aiResponse.product_url,
      notes: aiResponse.technical_notes,
      brand: brand,
      catalogNumber: catalogNumber,
      source: `AI Search (AIMLAPI - Gemini 1.5 Flash)`
    };

    console.log(`Edge Function: External search for catalog ${catalogNumber}, brand ${brand} found details via AIMLAPI.`);

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