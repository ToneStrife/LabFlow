import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { GoogleGenAI } from "npm:@google/genai@^1.28.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ¡IMPORTANTE! Tu clave de API de Gemini se obtiene de los secretos de Supabase
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not set.");
}
const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Verificar la sesión del usuario (opcional pero recomendado para funciones de pago)
    // Aunque no se usa el cliente de auth, es buena práctica verificar la autorización si es necesario.
    
    // 2. Extraer 'brand' y 'catalogNumber' del cuerpo de la solicitud
    const { brand, catalogNumber } = await req.json();
    
    if (!brand || !catalogNumber) {
      return new Response(JSON.stringify({
        error: "Brand and catalogNumber are required"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // 3. Lógica de Gemini
    const prompt = `
      Please find the product details for a product from the brand "${brand}" with the catalog number "${catalogNumber}".
      Use the provided tools to search the web for the most accurate information.
      Respond with ONLY a JSON object (wrapped in \`\`\`json ... \`\`\`) that follows this exact structure:
      {
        "product_name": "string | 'Producto No Encontrado'", "catalog_number": "string", "unit_price": "number | null",
        "format": "string | null", "link": "string (URL) | null", "notes": "string | null", "brand": "string"
      }
      - product_name: The full name of the product. If not found, it MUST be 'Producto No Encontrado'.
      - catalog_number: The product's catalog number.
      - unit_price: The price per unit (as a number, without currency symbol). If not available, it MUST be null.
      - format: The format or packaging of the product. If not available, it MUST be null.
      - link: A direct URL to the product page. If not found, it MUST be null.
      - notes: Any important notes or key features. If the product is not found, it MUST be 'No se pudo encontrar el producto...'.
      - brand: The brand of the product.
      Do not include any other text or explanation outside of the JSON object.
    `;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [
          {
            googleSearch: {}
          }
        ]
      }
    });
    
    const responseText = response.text;
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
    
    // Intentar parsear el JSON y normalizar los tipos
    const details = JSON.parse(jsonString);
    
    // Normalización de tipos para el cliente
    const normalizedDetails = {
        product_name: details.product_name || 'Producto No Encontrado',
        catalog_number: details.catalog_number || catalogNumber,
        unit_price: (typeof details.unit_price === 'number' && details.unit_price > 0) ? details.unit_price : null,
        format: details.format || null,
        link: details.link || null,
        notes: details.notes || null,
        brand: details.brand || brand,
    };

    return new Response(JSON.stringify(normalizedDetails), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error: any) {
    console.error("Edge Function Error:", error);
    return new Response(JSON.stringify({
      error: error.message || 'An unexpected error occurred in the Edge Function.'
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});