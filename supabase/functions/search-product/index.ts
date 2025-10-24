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
      Eres un especialista en la extracción de datos de productos de laboratorio. Tu única tarea es recibir una marca y un número de catálogo, buscar el producto en internet y devolver los detalles en un formato JSON estricto. Debes ser extremadamente preciso y priorizar las fuentes oficiales del fabricante.

      El esquema JSON que debes seguir es:
      {
        "product_name": "string",
        "pack_size": "string",
        "estimated_price": "number",
        "product_url": "string",
        "technical_notes": "string"
      }

      Si no puedes encontrar un dato, el valor del campo debe ser null. Si no encuentras el producto, devuelve un JSON con todos los campos en null.
    `;

    const userPrompt = `
      Por favor, busca y extrae la información para el siguiente producto:
      - MARCA: ${brand}
      - NÚMERO DE CATÁLOGO: ${catalogNumber}
    `;

    const response = await fetch("https://api.aimlapi.com/v1/chat/completions", { // Endpoint corregido
      method: "POST",
      headers: {
        "Authorization": `Bearer ${aiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "claude-3.5-sonnet", // Modelo compatible con AIMLAPI
        "response_format": { "type": "json_object" },
        "messages": [
          { "role": "system", "content": systemInstruction },
          { "role": "user", "content": userPrompt }
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

    let aiResponse: any;
    try {
      aiResponse = JSON.parse(rawResponse);
    } catch (jsonError) {
      console.error('Edge Function: Failed to parse AI JSON response:', jsonError, 'Raw Response:', rawResponse);
      return new Response(JSON.stringify({ error: 'AI response could not be parsed.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!aiResponse || !aiResponse.product_name) {
      return new Response(JSON.stringify({ error: `AI could not find reliable information for Catalog #: '${catalogNumber}' and Brand: '${brand || "N/A"}'.` }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const productDetails = {
      productName: aiResponse.product_name,
      format: aiResponse.pack_size,
      unitPrice: aiResponse.estimated_price,
      link: aiResponse.product_url,
      notes: aiResponse.technical_notes,
      brand: brand,
      catalogNumber: catalogNumber,
      source: "AI Search (AIMLAPI - Claude 3.5)" // Fuente actualizada
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