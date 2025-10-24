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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const prompt = `
      You are a meticulous data verification specialist for a lab supply company. Your sole task is to find a specific product online and return its details in a precise JSON format. Accuracy is paramount.

      **Product to Verify:**
      - Brand: "${brand}"
      - Catalog Number: "${catalogNumber}"

      **Your Internal Thought Process (Follow this before generating the output):**
      1.  **Search:** I will search for the official manufacturer's page or a major distributor's page for "${brand} ${catalogNumber}".
      2.  **Verify Source:** Is the webpage I found from the official brand website or a top-tier distributor (like Thermo Fisher, Sigma-Aldrich, VWR)? If not, I must fail.
      3.  **Confirm Exact Match:** Does the page explicitly list the Brand as "${brand}" and the Catalog Number as "${catalogNumber}"? It must be an exact match. If not, I must fail.
      4.  **Extract Data:** Now that I've confirmed the source and the match, I will extract the required fields.
          -   \`productName\`: What is the full product name?
          -   \`format\`: What is the size/quantity (e.g., "500 mL")?
          -   \`unitPrice\`: Is there a price listed? Is it in EUROS? If it's in another currency, I will convert it to EUR and make a note. If no price is found, I will use \`null\`.
          -   \`link\`: What is the direct URL of this page?
          -   \`notes\`: I will add a key technical detail, like storage temperature. If I converted the price, I will note the original currency here (e.g., "Storage: -20°C. Price converted from USD.").
      5.  **Final Check:** Does my JSON output strictly follow the format rules? Is there any text outside the markdown block?

      **Output Instructions:**
      - Your entire response MUST be ONLY a single JSON object inside a markdown code block.
      - If you successfully extract the data, provide the full JSON object.
      - If you fail at any step (cannot find a reliable source or confirm an exact match), you MUST return an empty JSON object.

      **Successful Output Example:**
      \`\`\`json
      {
        "productName": "E. coli DH5a Competent Cells",
        "format": "10x 50µl",
        "unitPrice": 145.50,
        "link": "https://www.thermofisher.com/order/catalog/product/18265017",
        "notes": "Storage: -80°C. Price converted from USD.",
        "brand": "${brand}",
        "catalogNumber": "${catalogNumber}",
        "source": "AI Search (Gemini 1.5 Pro)"
      }
      \`\`\`

      **Failure Output:**
      \`\`\`json
      {}
      \`\`\`
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