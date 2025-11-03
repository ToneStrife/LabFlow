// functions/ai-product-search/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Estructura de respuesta de fallback en caso de error o falta de confianza
const createFallbackResponse = (brand: string | null, catalogNumber: string | null, productName: string | null, errorMessage: string) => {
    return {
        product_name: productName || "No disponible",
        catalog_number: catalogNumber || "No disponible",
        brand: brand || null,
        unit_price: null,
        format: null,
        link: null,
        source: 'DB', // Indica que la IA falló y se debe usar el fallback de DB
        notes: `AI Search Failed: ${errorMessage}`,
    };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  let brand: string | null = null;
  let catalogNumber: string | null = null;
  let productName: string | null = null;

  try {
    // 1) Verificar sesión
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );
    const { error: authError } = await supabase.auth.getUser();
    if (authError) {
      throw new Error("Unauthorized: Invalid session");
    }

    // 2) Clave Gemini
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("Server Error: GEMINI_API_KEY missing");
    }

    // 3) Body del request
    const body = await req.json();
    brand = body.brand;
    catalogNumber = body.catalogNumber;
    productName = body.productName;

    // 4) Prompt más estricto
    const prompt = `
Eres un experto en catálogos de laboratorio. Tu tarea es encontrar información precisa sobre un producto.
Tu respuesta DEBE ser un objeto JSON que contenga los detalles del producto.
REGLAS CRÍTICAS:
1. Solo busca información para el NÚMERO DE CATÁLOGO y la MARCA proporcionados.
2. Si no encuentras un PRECIO ESTIMADO, DEBES devolver 'null' para ese campo.
3. Si no encuentras una URL de producto, DEBES devolver 'null' para ese campo.
4. NO INVENTES NINGÚN DATO. Si no estás seguro, devuelve 'null' para los campos de enriquecimiento.

Entrada:
- MARCA: ${brand || "No especificada"}
- NÚMERO DE CATÁLOGO: ${catalogNumber || "No especificado"}
- NOMBRE (solo referencia): ${productName || "No especificado"}

Campos a devolver (SOLO JSON):
- product_name (string | "No disponible")
- pack_size (string | null)
- estimated_price (number | null)   // en euros si aparece claramente
- product_url (string | null)
- technical_notes (string | null)
`;

    // 5) Modelo + esquema de salida (structured output)
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", 
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            product_name: { type: "string" },
            pack_size: { type: "string", nullable: true },
            estimated_price: { type: "number", nullable: true },
            product_url: { type: "string", nullable: true },
            technical_notes: { type: "string", nullable: true },
          },
          required: ["product_name", "pack_size", "estimated_price", "product_url", "technical_notes"],
        },
      },
    });

    // 6) Llamada a la IA
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    // 7) Parseo de respuesta JSON
    const jsonText = result.response.text();
    let data: any;
    try {
      data = JSON.parse(jsonText);
    } catch (e) {
      console.error("AI returned invalid JSON:", jsonText);
      throw new Error("La IA no devolvió JSON válido.");
    }
    
    // 8) Validación de Confianza y Normalización
    
    // Criterio de fallo RELAJADO: Si no se encontró el nombre del producto O la URL, consideramos que falló.
    // El precio ya no es un requisito estricto para el éxito.
    const isUnreliable = !data.product_name || !data.product_url;
    
    if (isUnreliable) {
        // Forzar el fallback a DB si la IA no pudo encontrar datos clave
        return new Response(JSON.stringify(createFallbackResponse(
            brand, 
            catalogNumber, 
            productName, 
            "La IA no pudo encontrar el nombre del producto o una URL verificable."
        )), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const out = {
      product_name: data.product_name || productName || "No disponible",
      catalog_number: catalogNumber || "No disponible",
      brand: brand || null,
      unit_price: data.estimated_price ?? null,
      format: data.pack_size ?? null,
      link: data.product_url ?? null,
      source: "AI",
      notes: data.technical_notes ?? null,
    };

    return new Response(JSON.stringify(out), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Edge error:", err);
    
    // Si hay un error, devolvemos una respuesta 200 con el objeto de fallback
    const errorMessage = err?.message || "Unexpected error in Edge Function.";
    const fallback = createFallbackResponse(brand, catalogNumber, productName, errorMessage);
    
    return new Response(JSON.stringify(fallback), {
      status: 200, // Devolver 200 para evitar FunctionsHttpError en el cliente
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});