import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from 'https://esm.sh/@google/generative-ai@0.15.0';

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

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      systemInstruction: {
        role: "system",
        parts: [{ text: systemInstruction }],
      },
      generationConfig: {
        responseMimeType: "application/json",
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });

    const response = await result.response;
    const rawResponse = response.text();
    
    let aiResponse: any;
    try {
      aiResponse = JSON.parse(rawResponse);
    } catch (jsonError) {
      console.error('Edge Function: Failed to parse Gemini JSON response:', jsonError, 'Raw Response:', rawResponse);
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