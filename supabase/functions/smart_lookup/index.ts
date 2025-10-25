// deno-lint-ignore-file no-explicit-any
// Supabase Edge Function: smart_lookup con Gemini 2.5 Flash

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!
);

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const GEMINI_MODEL = "gemini-2.5-flash"; // ✅ modelo actualizado

type Candidate = { url: string; title?: string; metaDesc?: string; specs?: any; body?: string };

function providerUrls(catalog: string) {
  const c = encodeURIComponent(catalog);
  return [
    `https://www.sigmaaldrich.com/ES/en/search/${c}?focus=products`,
    `https://www.thermofisher.com/search/results?query=${c}`,
    `https://es.vwr.com/store/search?searchBy=PartNumber&searchTerm=${c}`,
    `https://www.abcam.com/search?Keywords=${c}`,
    `https://www.biolegend.com/en-us/search-results?keywords=${c}`,
    `https://www.qiagen.com/es/search?q=${c}`,
    `https://www.jacksonimmuno.com/search?keywords=${c}`
  ];
}

async function fetchHtml(u: string): Promise<string | null> {
  try {
    const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

function extractText(html: string) {
  const $ = cheerio.load(html);
  const title = ($("meta[property='og:title']").attr("content") || $("title").text() || "").trim();
  const metaDesc = ($("meta[name='description']").attr("content") || "").trim();
  const specs: Record<string, string> = {};
  $("table, dl").each((_, el) => {
    const t = cheerio.load($(el).html() || "");
    t("tr").each((__, tr) => {
      const cells = t(tr).find("th,td");
      if (cells.length >= 2) {
        const k = t(cells.get(0)).text().trim();
        const v = t(cells.get(cells.length - 1)).text().trim();
        if (k && v) specs[k] = v;
      }
    });
    t("dt").each((__, dt) => {
      const k = t(dt).text().trim();
      const v = t(dt).next("dd").text().trim();
      if (k && v) specs[k] = v;
    });
  });
  const body = $("body").text().replace(/\s+/g, " ").slice(0, 6000);
  return { title, metaDesc, specs, body };
}

function normCat(s: string) {
  return (s || "").toUpperCase().replace(/[\s\-_\.]/g, "");
}

async function geminiExtract(brandQ: string, catalogQ: string, candidates: Candidate[]) {
  const prompt = `
Eres un extractor de fichas de producto de laboratorio.
Tu objetivo es encontrar la información más precisa para el producto con el número de catálogo "${catalogQ}" (normalizado: "${normCat(catalogQ)}") y la marca "${brandQ}".
Devuelve SOLO JSON válido con estas claves en español:
{
  "marca": string|null,
  "numero_catalogo": string|null,
  "nombre_producto": string|null,
  "formato": string|null,
  "precio_unitario": number|null,
  "enlace_producto": string|null,
  "notas": string|null
}
**Instrucciones clave:**
1.  **Prioriza la coincidencia exacta del número de catálogo.** Si encuentras el número de catálogo en el texto, es muy probable que sea el producto correcto.
2.  **Extrae el 'nombre_producto' completo y oficial.**
3.  **'formato' debe ser el tamaño del paquete o la presentación.**
4.  **'precio_unitario' debe ser solo el número, sin símbolos de moneda.**
5.  **'enlace_producto' debe ser la URL directa a la página del producto.**
6.  **'notas' debe ser un resumen conciso de la descripción o características técnicas.**
7.  Si no hay datos claros o no estás seguro, deja el campo en \`null\`.
`;

  const user = `
marca buscada: "${brandQ}"
numero_catalogo buscado: "${catalogQ}" (normalizado: "${normCat(catalogQ)}")

Datos HTML resumidos de los candidatos encontrados:
${candidates.map((c, i) => `
--- Candidato ${i + 1} (URL: ${c.url}) ---
Título: ${c.title || 'N/A'}
Meta Descripción: ${c.metaDesc || 'N/A'}
Especificaciones: ${JSON.stringify(c.specs) || 'N/A'}
Cuerpo del texto (fragmento): ${c.body ? c.body.slice(0, 1000) + (c.body.length > 1000 ? '...' : '') : 'N/A'}
`).join('\n')}
`;

  console.log('Edge Function: Sending to Gemini - Prompt:', prompt); // Nuevo log
  console.log('Edge Function: Sending to Gemini - User Content:', user); // Nuevo log

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt + "\n" + user }] }],
    generationConfig: { temperature: 0, responseMimeType: "application/json" }
  };

  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`Gemini HTTP ${r.status}`);
  const data = await r.json();
  console.log('Edge Function: Raw Gemini API response:', JSON.stringify(data)); // Nuevo log
  const txt = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  try { return JSON.parse(txt); } catch { return {}; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  if (req.method !== "POST") return new Response("Use POST", { status: 405 });
  
  console.log('Edge Function: smart_lookup received request.');
  const { brand, catalog } = await req.json();
  const brandQ = (brand || "").trim();
  const catalogQ = (catalog || "").trim();
  console.log(`Edge Function: Searching for Brand: "${brandQ}", Catalog: "${catalogQ}"`);

  if (!catalogQ) {
    console.error('Edge Function: Catalog number is required.');
    return new Response(JSON.stringify({ error: "Catalog number is required." }), { status: 400, headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } });
  }

  // 0️⃣ cache
  const cached = await supabase.from("items_cache")
    .select("result_json").eq("brand_q", brandQ).eq("catalog_q", catalogQ)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (cached.data?.result_json) {
    console.log('Edge Function: Cache hit!');
    return new Response(JSON.stringify(cached.data.result_json), { headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } });
  }
  console.log('Edge Function: Cache miss. Checking master data.');

  // 1️⃣ histórico
  let master = null;
  try {
    const { data } = await supabase.rpc("smart_master_lookup", { brand_q: brandQ, catalog_q: catalogQ });
    master = data;
  } catch (e) {
    console.error("Edge Function: Error calling smart_master_lookup RPC:", e);
    // master remains null
  }
  
  if (master && master.match && master.match.score >= 0.8) {
    console.log('Edge Function: Master data hit with score:', master.match.score);
    const m = master.record;
    const result = {
      marca: m.brand ?? null,
      numero_catalogo: m.catalog ?? null,
      nombre_producto: m.product_name ?? null,
      formato: m.package_format ?? m.units ?? null,
      precio_unitario: m.unit_price ?? null,
      enlace_producto: m.product_url ?? null,
      notas: m.notes ?? null,
      _source: "master"
    };
    await supabase.from("items_cache").insert({ brand_q: brandQ, catalog_q: catalogQ, result_json: result, source: "master" });
    return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } });
  }
  console.log('Edge Function: No strong master data hit. Proceeding to scraping.');

  // 2️⃣ scraping proveedores
  const urls = providerUrls(catalogQ);
  const candidates: Candidate[] = [];
  for (const u of urls) {
    const html = await fetchHtml(u);
    if (!html) continue;
    const { title, metaDesc, specs, body } = extractText(html);
    candidates.push({ url: u, title, metaDesc, specs, body });
  }
  console.log(`Edge Function: Found ${candidates.length} candidates from scraping.`);

  // 3️⃣ Gemini 2.5 Flash
  let llmJson: any = {};
  try {
    llmJson = await geminiExtract(brandQ, catalogQ, candidates);
    console.log('Edge Function: Gemini extracted JSON:', JSON.stringify(llmJson));
  } catch (e) {
    console.error('Edge Function: Error during Gemini extraction:', e);
    // llmJson remains {}
  }

  // 4️⃣ cache + respuesta
  // Check if Gemini returned meaningful data
  if (!llmJson || !llmJson.nombre_producto) {
    console.warn('Edge Function: Gemini did not return a product name. Returning error.');
    await supabase.from("items_cache").insert({ brand_q: brandQ, catalog_q: catalogQ, result_json: llmJson, source: "web_failed" }); // Cache failure
    return new Response(JSON.stringify({ error: "AI could not find reliable product details." }), {
      status: 404, // Not Found
      headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' }
    });
  }

  await supabase.from("items_cache").insert({ brand_q: brandQ, catalog_q: catalogQ, result_json: llmJson, source: "web" });
  console.log('Edge Function: Successfully processed with Gemini and cached. Returning result.');
  return new Response(JSON.stringify(llmJson), { headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } });
});