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
      You are an automated agent for a laboratory supply management system. Your task is to find specific product information online and return it in a structured JSON format.

      **INPUTS:**
      - Brand: "${brand}"
      - Catalog Number: "${catalogNumber}"

      **INSTRUCTIONS (Follow these steps exactly):**

      **Step 1: Search**
      - Perform a web search for a product with the EXACT Brand AND Catalog Number provided above.
      - Example search query: "${brand} ${catalogNumber} official site"

      **Step 2: Verify Source**
      - From the search results, find a link to the OFFICIAL manufacturer's product page or a page from a MAJOR, reputable distributor (like Thermo Fisher, Sigma-Aldrich, VWR, Millipore, Bio-Rad, Abcam).
      - DO NOT use data from non-official resellers, forums, or research papers.

      **Step 3: Confirm Match**
      - On the verified page, confirm that BOTH the Brand and the Catalog Number EXACTLY match the inputs.
      - If there is any ambiguity or if it's a similar but not identical product, consider it a failure.

      **Step 4: Extract Data (ONLY if Step 3 is successful)**
      - If an exact match is confirmed, extract the following fields from the page:
        - \`productName\`: The full, official product name.
        - \`format\`: The package size or format (e.g., "500 mL", "100 reactions").
        - \`unitPrice\`: The price in EUROS. If not available or not in EUROS, use \`null\`.
        - \`link\`: The direct URL to the product page you used for verification.
        - \`notes\`: A brief, one-sentence technical detail (e.g., "Storage: -20°C").
        - \`source\`: "AI Search (Gemini)"

      **Step 5: Format Output**
      - Construct a JSON object with the extracted data.
      - The \`brand\` and \`catalogNumber\` fields in the JSON MUST be the same as the input values.
      - **CRITICAL:** Your entire response MUST be ONLY the JSON object, enclosed in a markdown code block. Example: \`\`\`json\n{"key": "value"}\n\`\`\`
      - Do not add any text, explanation, or apologies before or after the JSON block.

      **FAILURE PROTOCOL:**
      - If you cannot complete Step 2 (no reliable source) or Step 3 (no exact match), you MUST immediately STOP and return an empty JSON object.
      - Failure output format: \`\`\`json\n{}\n\`\`\`
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