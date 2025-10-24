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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" }); // Usar el modelo más potente
    
    const prompt = `
      You are a data extraction robot. Your only job is to find a specific lab product online and return its details in JSON format. You must be extremely precise.

      **Product to Find:**
      - Brand: "${brand}"
      - Catalog Number: "${catalogNumber}"

      **Your Task (Follow these steps exactly):**

      1.  **Find the Official Page:** Search for the product's official page from the manufacturer or a major distributor (e.g., Thermo Fisher, Sigma-Aldrich, VWR).
      2.  **Verify Exact Match:** On that page, confirm that the brand and catalog number are an EXACT match to the inputs.
      3.  **Extract Data:** If you confirm an exact match, extract the following fields. If you cannot find a specific piece of information on the page, you MUST use \`null\` for that field. Do not invent data.
          -   \`productName\`: The full, official product name.
          -   \`format\`: The package size (e.g., "500 mL", "100 reactions").
          -   \`unitPrice\`: The price in EUROS. Use \`null\` if not found or not in EUROS.
          -   \`link\`: The direct URL to the product page.
          -   \`notes\`: A brief technical detail (e.g., "Storage: -20°C").
      4.  **Format Output:** Your entire response MUST be ONLY the JSON object, wrapped in a markdown code block.

      **Failure Condition:** If you cannot find an official page with an exact match for BOTH brand and catalog number, you MUST return an empty JSON object: \`\`\`json\n{}\n\`\`\`
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let rawResponse = response.text();

    let productDetails: any = {};

    if (rawResponse) {
      const jsonMatch = rawResponse.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        rawResponse = jsonMatch[1];
      } else {
        console.warn('Edge Function: Gemini response did not contain ```json block. Attempting direct parse.');
      }

      const cleanedResponse = rawResponse.replace(/: undefined/g, ': null');

      try {
        productDetails = JSON.parse(cleanedResponse);
        productDetails.catalogNumber = catalogNumber;
        productDetails.brand = brand;
        productDetails.source = "AI Search (Gemini 1.5 Pro)";
      } catch (jsonError) {
        console.error('Edge Function: Failed to parse Gemini JSON response:', jsonError);
        return new Response(JSON.stringify({ error: 'AI response could not be parsed.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (!productDetails || Object.keys(productDetails).length === 0 || !productDetails.productName) {
      return new Response(JSON.stringify({ error: `AI could not find reliable information for Catalog #: '${catalogNumber}' and Brand: '${brand || "N/A"}'.` }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

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