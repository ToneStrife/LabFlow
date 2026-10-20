import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { GoogleGenAI } from "npm:@google/genai@^1.28.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ITEMS = 50;
const MODELOS = ["gemini-2.5-flash", "gemini-2.0-flash"];

const ALLOWED_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not set.");
}

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

function normalizeMime(mimeType: unknown): string {
  const mime = String(mimeType || "application/pdf").toLowerCase().trim();
  if (mime === "image/jpg") return "image/jpeg";
  return mime;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "GEMINI_API_KEY no está configurada en el servidor. Un administrador debe añadirla en los secretos de Supabase.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

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

    const body = await req.json();
    const fileBase64 =
      (typeof body.fileBase64 === "string" && body.fileBase64) ||
      (typeof body.pdfBase64 === "string" && body.pdfBase64) ||
      "";
    const mimeType = normalizeMime(body.mimeType);

    if (!fileBase64) {
      return new Response(
        JSON.stringify({ error: "Falta el archivo (fileBase64 / pdfBase64)." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!ALLOWED_MIMES.has(mimeType)) {
      return new Response(
        JSON.stringify({
          error:
            "Formato no soportado. Usa PDF o imagen (JPG, PNG, WEBP, GIF).",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const estimatedBytes = Math.floor((fileBase64.length * 3) / 4);
    if (estimatedBytes > MAX_FILE_BYTES) {
      return new Response(
        JSON.stringify({
          error: "El archivo supera el tamaño máximo permitido (5 MB).",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const esImagen = mimeType.startsWith("image/");
    const prompt = `
Analiza el ${esImagen ? "archivo de imagen / captura de pantalla" : "PDF"} adjunto (presupuesto o cotización de laboratorio) y extrae ÚNICAMENTE las líneas de productos o reactivos pedidos.

Reglas:
- Ignora totales, subtotales, IVA, condiciones de pago, datos del cliente, cabeceras y pies de página.
- Cada línea de producto debe incluir la mayor información disponible del documento.
- Si un campo no aparece, usa null (excepto quantity, mínimo 1).
- unitPrice debe ser un número sin símbolo de moneda; si no hay precio unitario claro, null.
- quantity debe ser un entero >= 1.
${esImagen ? "- Lee el texto visible en la captura aunque esté un poco borroso o sesgado.\n" : ""}
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

    let lastError: unknown = null;
    let responseText = "";

    for (const model of MODELOS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { mimeType, data: fileBase64 } },
                { text: prompt },
              ],
            },
          ],
        });
        responseText = response.text ?? "";
        if (responseText.trim()) break;
      } catch (err) {
        lastError = err;
        console.error(`[parse-quote-pdf] Modelo ${model} falló:`, err);
      }
    }

    if (!responseText.trim()) {
      const msg =
        lastError instanceof Error
          ? lastError.message
          : "Gemini no devolvió respuesta al analizar el presupuesto.";
      throw new Error(msg);
    }

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
