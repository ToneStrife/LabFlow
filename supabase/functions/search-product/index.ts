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
    // Autenticación del usuario que llama a la función
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
      return new Response(JSON.stringify({ error: 'No autorizado: Sesión inválida' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Obtener datos de la solicitud
    const { catalogNumber, brand } = await req.json();
    if (!catalogNumber) {
      return new Response(JSON.stringify({ error: 'Campo requerido faltante: catalogNumber' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verificar la clave de API de Gemini
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: 'Error de configuración del servidor: GEMINI_API_KEY no está configurada.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Prompt para la IA (Traducido y ajustado para búsqueda en español)
    const systemInstruction = `
      Eres un asistente de IA altamente especializado en la extracción de datos de productos de laboratorio. Tu única tarea es encontrar información precisa sobre un producto basándote en una MARCA y NÚMERO DE CATÁLOGO exactos.

      **Instrucciones Críticas (Debes seguirlas al pie de la letra):**
      1.  **COINCIDENCIA EXACTA O NADA:** Tu objetivo principal es encontrar la página del producto en el sitio web oficial del fabricante que coincida EXACTAMENTE con la MARCA y el NÚMERO DE CATÁLOGO proporcionados.
      2.  **NO ADIVINES:** Si no encuentras una coincidencia exacta, NO debes proporcionar información de un producto similar, aunque el número de catálogo sea parecido. NO inventes información.
      3.  **FORMATO JSON ESTRICTO:** Tu respuesta DEBE ser únicamente un objeto JSON válido con el siguiente esquema. No incluyas texto, explicaciones ni markdown antes o después del JSON.

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
      - \`estimated_price\`: El precio de lista en la moneda que encuentres. Solo el número, sin símbolos.
      - \`product_url\`: El enlace directo y funcional a la página del producto.
      - \`technical_notes\`: Un resumen muy breve de la descripción o notas técnicas del producto.
      - \`confidence_score\`: Tu nivel de confianza (de 0.0 a 1.0) de que la información encontrada es 100% correcta para el producto exacto solicitado. 1.0 es certeza absoluta.

      **CASO DE FALLO (MUY IMPORTANTE):**
      Si no puedes encontrar una página oficial del producto con una coincidencia EXACTA para la marca y el número de catálogo, o si tienes la más mínima duda, DEBES devolver este JSON exacto:
      {
        "product_name": null,
        "pack_size": null,
        "estimated_price": null,
        "product_url": null,
        "technical_notes": null,
        "confidence_score": 0.1
      }
    `;

    const userPrompt = `
      Busca y extrae la información para el siguiente producto. Sigue las instrucciones críticas al pie de la letra.
      - MARCA: "${brand}"
      - NÚMERO DE CATÁLOGO: "${catalogNumber}"
    `;

    const combinedPrompt = `${systemInstruction}\n\n${userPrompt}`;
    
    const MODEL_NAME = "gemini-2.5-flash"; 

    // Llamada a la API de Google Gemini
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${geminiApiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "contents": [{
          "parts": [{ "text": combinedPrompt }]
        }],
        "generationConfig": {
          "response_mime_type": "application/json",
        }
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Edge Function: Google Gemini API error:', response.status, errorBody);
      return new Response(JSON.stringify({ error: `Error de la API de Google Gemini (${response.status}): ${response.statusText}` }), { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
        console.error('Edge Function: No candidates returned from Gemini API:', data);
        return new Response(JSON.stringify({ error: 'La IA devolvió una respuesta vacía.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    const rawResponse = data.candidates[0].content.parts[0].text;
    
    console.log('Edge Function: Raw AI Response from Google Gemini:', rawResponse);

    let aiResponse: any;
    try {
      aiResponse = JSON.parse(rawResponse);
    } catch (jsonError) {
      console.error('Edge Function: Failed to parse AI JSON response:', jsonError, 'Raw Response:', rawResponse);
      return new Response(JSON.stringify({ error: 'La respuesta de la IA no pudo ser analizada.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Lógica de error mejorada
    const confidence = aiResponse.confidence_score || 0;
    if (!aiResponse || !aiResponse.product_name || confidence < 0.7) { // Aumentado el umbral de confianza
      const brandDisplay = brand || "N/A";
      const errorMsg = `La IA no pudo encontrar información fiable (Confianza: ${confidence.toFixed(2)}) para el Número de Catálogo: '${catalogNumber}' y Marca: '${brandDisplay}'. Por favor, verifica las entradas o ingresa los detalles manualmente.`;
      return new Response(JSON.stringify({ error: errorMsg }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const productDetails = {
      productName: aiResponse.product_name,
      format: aiResponse.pack_size,
      unitPrice: aiResponse.estimated_price,
      link: aiResponse.product_url,
      notes: aiResponse.technical_notes,
      brand: brand,
      catalogNumber: catalogNumber,
      source: `Búsqueda IA (Google Gemini 2.5 Flash) | Confianza: ${confidence.toFixed(2)}`
    };

    return new Response(JSON.stringify({ products: productDetails }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Edge Function: Unhandled error in search-product:', error);
    return new Response(JSON.stringify({ error: error.message || 'Ocurrió un error inesperado.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});