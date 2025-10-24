import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { verify } from 'https://deno.land/x/djwt@v2.8/mod.ts';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.15.0'; // Importar el SDK de Google Gemini

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
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verificar el JWT del usuario que llama (asegura que solo usuarios autenticados puedan usar esta función)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = authHeader.replace('Bearer ', '');
    let payload;
    try {
      const jwtSecret = Deno.env.get('JWT_SECRET');
      if (!jwtSecret) {
        return new Response(JSON.stringify({ error: 'Server configuration error: JWT secret not found.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const encoder = new TextEncoder();
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        encoder.encode(jwtSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"]
      );
      payload = await verify(token, cryptoKey, 'HS256');
    } catch (jwtError: any) {
      return new Response(JSON.stringify({ error: `Unauthorized: Invalid token - ${jwtError.message}` }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { catalogNumber, brand } = await req.json();

    if (!catalogNumber) {
      return new Response(JSON.stringify({ error: 'Missing required field: catalogNumber' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- INTEGRACIÓN REAL CON GOOGLE GEMINI ---
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error: GEMINI_API_KEY is not set.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    
    const prompt = `
      Search the internet for a lab/scientific product with Brand: '${brand}' and Catalog Number: '${catalogNumber}'.
      Extract the following details:
      - Full product name
      - Package size/format (e.g., "100 tubes", "500ml", "50 reactions")
      - Estimated price in EUROS (only if clearly stated and reliable)
      - URL of a reliable product page (e.g., manufacturer, major distributor)
      - Brief technical notes (key specifications, storage conditions, applications).

      Be precise and only return information you are confident about. If you cannot find a specific piece de information, omit it or use the value 'null'.
      Return the information in a JSON object matching the following schema:
      {
        "productName": "string",
        "catalogNumber": "string",
        "unitPrice": "number | null",
        "format": "string | null",
        "link": "string | null",
        "brand": "string",
        "notes": "string | null",
        "source": "string"
      }
      Ensure the 'catalogNumber' and 'brand' in the output match the input.
      If no reliable information is found, return an empty JSON object {}.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let rawResponse = response.text(); // Gemini devuelve el contenido como texto

    let productDetails: any = {};

    if (rawResponse) {
      // 1. Extraer la cadena JSON de los bloques de código Markdown
      const jsonMatch = rawResponse.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        rawResponse = jsonMatch[1];
      } else {
        console.warn('Edge Function: Gemini response did not contain ```json block. Attempting direct parse.');
      }

      // 2. Limpiar la cadena JSON: reemplazar 'undefined' por 'null'
      // Esto es crucial porque LLMs a menudo usan 'undefined' para campos opcionales, lo cual no es JSON válido.
      const cleanedResponse = rawResponse.replace(/: undefined/g, ': null');

      try {
        productDetails = JSON.parse(cleanedResponse);
        // Asegurarse de que el catalogNumber y brand coincidan con la entrada
        productDetails.catalogNumber = catalogNumber;
        productDetails.brand = brand;
        productDetails.source = "AI Search (Gemini)";
      } catch (jsonError) {
        console.error('Edge Function: Failed to parse Gemini JSON response:', jsonError);
        return new Response(JSON.stringify({ error: 'AI response could not be parsed. It might not be valid JSON or the format is unexpected.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (!productDetails || Object.keys(productDetails).length === 0 || !productDetails.productName) {
      return new Response(JSON.stringify({ error: `AI could not find detailed information for product with Catalog Number: '${catalogNumber}' and Brand: '${brand || "N/A"}'.` }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Edge Function: External search for catalog ${catalogNumber}, brand ${brand} found details.`);

    return new Response(JSON.stringify({ products: productDetails }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Edge Function: Unhandled error in search-product:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred in the Edge Function.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});