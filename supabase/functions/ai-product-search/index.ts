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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // 1) Verificar sesión (asegúrate de enviar Authorization: Bearer <token> desde el cliente)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Clave Gemini
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "Server Error: GEMINI_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Body del request
    const { brand, catalogNumber, productName } = await req.json();

    // 4) Prompt
    const prompt = `
Actúa como experto en catálogos de laboratorio. Devuelve SOLO JSON según el esquema.
Identifica por MARCA y NÚMERO DE CATÁLOGO. No inventes datos.
Si no estás seguro de un campo, pon null.

Entrada:
- MARCA: ${brand || "No especificada"}
- NÚMERO DE CATÁLOGO: ${catalogNumber || "No especificado"}
- NOMBRE: ${productName || "No especificado"}

Campos a devolver:
- product_name (string | "No disponible")
- pack_size (string | null)
- estimated_price (number | null)   // en euros si aparece claramente
- product_url (string | null)
- technical_notes (string | null)
`;

    // 5) Modelo + esquema de salida (structured output)
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
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

    // 6) Llamada a la IA (estructura correcta de contents)
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    // 7) Parseo de respuesta JSON
    const jsonText = result.response.text();
    let data: any;
    try {
      data = JSON.parse(jsonText);
    } catch {
      throw new Error("La IA no devolvió JSON válido.");
    }

    // 8) Normalización a tu formato
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
    return new Response(JSON.stringify({ error: err?.message || "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
