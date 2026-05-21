import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { GoogleGenAI } from "npm:@google/genai@^1.28.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_PDF_BYTES = 5 * 1024 * 1024;
const MAX_ITEMS = 50;

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not set.");
}
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

interface ParsedQuoteItem {
  productName: string;
  catalogNumber: string;
  quantity: number;
  unitPrice: number | null;
  format: string | null;
  link: string | null;
  notes: string | null;
  brand: string | null;
}

function parsePositiveNumber(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function cleanString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

function normalizeItem(raw: Record<string, unknown>): ParsedQuoteItem | null {
  const productName =
    cleanString(raw.productName) ?? cleanString(raw.product_name) ?? "";
  const catalogNumber =
    cleanString(raw.catalogNumber) ?? cleanString(raw.catalog_number) ?? "";

  if (!productName && !catalogNumber) return null;

  const qtyRaw = Number(raw.quantity);
  const quantity =
    Number.isFinite(qtyRaw) && qtyRaw >= 1 ? Math.round(qtyRaw) : 1;

  return {
    productName: productName || "Producto sin nombre",
    catalogNumber: catalogNumber || "SIN-REF",
    quantity,
    unitPrice: parsePositiveNumber(raw.unitPrice ?? raw.unit_price),
    format: cleanString(raw.format),
    link: cleanString(raw.link),
    notes: cleanString(raw.notes),
    brand: cleanString(raw.brand),
  };
}

function extractJsonString(text: string): string {
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (fenced) return fenced[1].trim();
  const objStart = text.indexOf("{");
  const arrStart = text.indexOf("[");
  if (objStart === -1 && arrStart === -1) return text.trim();
  const start =
    arrStart !== -1 && (objStart === -1 || arrStart < objStart) ? arrStart : objStart;
  return text.slice(start).trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY no está configurada en el servidor." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { pdfBase64, mimeType = "application/pdf" } = await req.json();

    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return new Response(JSON.stringify({ error: "pdfBase64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mimeType !== "application/pdf") {
      return new Response(JSON.stringify({ error: "Only application/pdf is supported" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const estimatedBytes = Math.floor((pdfBase64.length * 3) / 4);
    if (estimatedBytes > MAX_PDF_BYTES) {
      return new Response(
        JSON.stringify({ error: "El PDF supera el tamaño máximo permitido (5 MB)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `
Analiza el PDF adjunto (presupuesto o cotización de laboratorio) y extrae ÚNICAMENTE las líneas de productos o reactivos pedidos.

Reglas:
- Ignora totales, subtotales, IVA, condiciones de pago, datos del cliente, cabeceras y pies de página.
- Cada línea de producto debe incluir la mayor información disponible del documento.
- Si un campo no aparece en el PDF, usa null (excepto quantity, mínimo 1).
- unitPrice debe ser un número sin símbolo de moneda; si no hay precio unitario claro, null.
- quantity debe ser un entero >= 1.

Responde SOLO con un objeto JSON (puedes envolverlo en \`\`\`json ... \`\`\`) con esta estructura exacta:
{
  "items": [
    {
      "productName": "string",
      "catalogNumber": "string",
      "quantity": 1,
      "unitPrice": null,
      "format": null,
      "link": null,
      "notes": null,
      "brand": null
    }
  ]
}

Si no encuentras ningún producto, devuelve { "items": [] }.
No incluyas texto fuera del JSON.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
            { text: prompt },
          ],
        },
      ],
    });

    const responseText = response.text ?? "";
    const jsonString = extractJsonString(responseText);
    const parsed = JSON.parse(jsonString) as { items?: unknown[] };
    const rawItems = Array.isArray(parsed.items) ? parsed.items : [];

    const items: ParsedQuoteItem[] = [];
    for (const raw of rawItems.slice(0, MAX_ITEMS)) {
      if (raw && typeof raw === "object") {
        const normalized = normalizeItem(raw as Record<string, unknown>);
        if (normalized) items.push(normalized);
      }
    }

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("parse-quote-pdf error:", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
