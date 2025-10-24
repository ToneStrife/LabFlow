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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const prompt = `
      CRITICAL INSTRUCTION: You are a highly precise scientific product verification agent. Your ONLY task is to find and extract EXACT lab product details based on the provided Brand and Catalog Number.

      STRICT RULES FOR SEARCH AND EXTRACTION:
      1.  **SEARCH:** Perform a thorough internet search for the product using BOTH the provided 'Brand' and 'Catalog Number'.
      2.  **VERIFICATION (CRITICAL):** You MUST verify the product name and specifications from an **OFFICIAL MANUFACTURER WEBSITE** or a **MAJOR LABORATORY DISTRIBUTOR WEBSITE** (e.g., Thermo Fisher Scientific, Sigma-Aldrich, Bio-Rad, Abcam, Corning, VWR, Avantor). Prioritize the manufacturer's website.
      3.  **EXACT MATCH ONLY:** Only if an **EXACT, UNDISPUTED MATCH** for the product (matching both brand and catalog number) is found on a reliable source, proceed to extract the details.
      4.  **NO GUESSING/INVENTION:** If no official, exact product page is found, or if the search results are ambiguous, speculative, or from unreliable sources (e.g., forums, blogs, non-official resellers), you MUST **STOP IMMEDIATELY** and return an **EMPTY JSON OBJECT {}**. Do NOT guess, substitute, invent, or infer any information or product name.

      If an EXACT match is reliably found, extract the following details:
      -   **Full product name:** The complete official name of the product.
      -   **Package size/format:** The specific packaging or format (e.g., "100 tubes", "500 mL", "50 reactions", "200pack 8cs of 25").
      -   **Estimated price in EUROS:** Only if clearly stated and reliable on the product page. If not found, use 'null'.
      -   **URL of the reliable product page:** The direct link to the official product page.
      -   **Brief technical notes:** Key specifications, storage conditions, or primary applications. Keep it concise. If not found, use 'null'.

      Return the information in a JSON object matching the following schema. Use 'null' for any missing optional fields.
      **Ensure the 'catalogNumber' and 'brand' in the output JSON EXACTLY match the input values provided in this prompt.**

      JSON SCHEMA:
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

    // Si el objeto JSON está vacío o no tiene un nombre de producto, significa que no se encontró una coincidencia exacta.
    if (!productDetails || Object.keys(productDetails).length === 0 || !productDetails.productName) {
      return new Response(JSON.stringify({ error: `AI could not find detailed information for product with Catalog Number: '${catalogNumber}' and Brand: '${brand || "N/A"}'. Please verify the exact catalog number and brand.` }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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