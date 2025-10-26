// deno-lint-ignore-file no-explicit-any
// Supabase Edge Function: smart_lookup con Gemini 2.5 Flash + DDG HTML + preparse

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!
);

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const GEMINI_MODEL = "gemini-2.5-flash";

type Candidate = {
  url: string;
  title?: string;
  metaDesc?: string;
  specs?: Record<string,string>;
  body?: string;
  skus?: string[];
  prices?: string[];
  sizes?: string[];
};

const VENDOR_DOMAINS = [
  "sigmaaldrich.com","milliporesigma.com","merckmillipore.com",
  "thermofisher.com","fishersci.com","fishersci.es",
  "vwr.com","es.vwr.com","avantorsciences.com",
  "abcam.com","biolegend.com","qiagen.com","jacksonimmuno.com"
];

function normCat(s: string) {
  return (s || "").toUpperCase().replace(/[\s\-_\.]/g, "");
}

async function fetchHtml(u: string): Promise<string | null> {
  try {
    const r = await fetch(u, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8"
      }
    });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

/** 1) Buscar en DDG HTML enlaces reales de proveedores */
async function ddgLinks(brandQ: string, catalogQ: string, limit = 6): Promise<string[]> {
  const qNorm = `${brandQ} ${catalogQ}`.trim();
  const siteFilter = VENDOR_DOMAINS.map(d => `site:${d}`).join(" OR ");
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(`"${qNorm}" ${siteFilter}`)}`;

  const html = await fetchHtml(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  const links: string[] = [];
  $(".result__a").each((_, a) => {
    const href = $(a).attr("href");
    if (!href) return;
    try {
      const u = new URL(href);
      if (VENDOR_DOMAINS.some(d => u.hostname.includes(d))) {
        links.push(href);
      }
    } catch {/* ignore */}
  });

  // Si salen pocos, añade búsqueda solo por catálogo
  if (links.length < 3) {
    const url2 = `https://duckduckgo.com/html/?q=${encodeURIComponent(`"${catalogQ}" ${siteFilter}`)}`;
    const html2 = await fetchHtml(url2);
    if (html2) {
      const $2 = cheerio.load(html2);
      $2(".result__a").each((_, a) => {
        const href = $2(a).attr("href");
        if (!href) return;
        try {
          const u = new URL(href);
          if (VENDOR_DOMAINS.some(d => u.hostname.includes(d))) {
            links.push(href);
          }
        } catch {}
      });
    }
  }
  // dedupe y corta
  return Array.from(new Set(links)).slice(0, limit);
}

/** 2) Extraer texto + señales (SKU, precio, tamaños) */
function extractFromHtml(html: string): Omit<Candidate,"url"> {
  const $ = cheerio.load(html);
  const title = ($("meta[property='og:title']").attr("content") || $("title").text() || "").trim();
  const metaDesc = ($("meta[name='description']").attr("content") || "").trim();

  const specs: Record<string,string> = {};
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

  const bodyText = $("body").text().replace(/\s+/g, " ");
  // Regex útiles: SKUs, precios, tamaños
  const skus = Array.from(bodyText.matchAll(/\b([A-Z0-9]{3,}[-\._]?[A-Z0-9]{2,})\b/g)).slice(0,30).map(m=>m[1]);
  const prices = Array.from(bodyText.matchAll(/([€$]\s?\d{1,4}(?:[.,]\d{2})?)/g)).slice(0,30).map(m=>m[1]);
  const sizes  = Array.from(bodyText.matchAll(/\b(\d+(?:[.,]\d+)?\s?(?:µl|ul|ml|l|mg|g|kg|pack|pcs|units|vial(?:es)?))\b/ig)).slice(0,30).map(m=>m[1]);

  const body = bodyText.slice(0, 8000);
  return { title, metaDesc, specs, body, skus, prices, sizes };
}

/** 3) Gemini con prompt robusto y ejemplo */
async function geminiExtract(brandQ: string, catalogQ: string, candidates: Candidate[]) {
  const catNorm = normCat(catalogQ);

  const system = `
Eres un extractor de fichas de producto de laboratorio para autocompletar formularios.
Solo respondes JSON válido con las claves:
{
  "marca": string|null,
  "numero_catalogo": string|null,
  "nombre_producto": string|null,
  "formato": string|null,
  "precio_unitario": number|null,
  "enlace_producto": string|null,
  "notas": string|null,
  "confidence_score": number (0.0 a 1.0) // Incluido para validación
}
Reglas:
- El "numero_catalogo" DEVUELTO DEBE CONTENER "${catNorm}" (ignora alternativas que no lo contengan).
- Prioriza candidatos cuyo dominio sea del fabricante o distribuidor y cuyo título/specs contengan el catálogo.
- Extrae "formato" a partir de tamaños/packaging si es inequívoco (ej. "1 mg", "500 µl", "200 pack").
- "precio_unitario": si ves un precio claro (símbolo y número), devuelve solo el número con punto decimal (ej. 120.50); si hay varios, el más cercano al SKU.
- Si falta información, usa null. Nunca inventes.
- Establece "confidence_score" en 0.9 o más si el SKU coincide y se encuentra el nombre del producto.
Ejemplo de salida:
{"marca":"Invitrogen","numero_catalogo":"18265017","nombre_producto":"E. coli DH5α Competent Cells","formato":"20×50 µl","precio_unitario":120.5,"enlace_producto":"https://...","notas":null, "confidence_score": 0.95}
`;

  const user = `
Consulta:
- Marca buscada: "${brandQ}"
- Nº catálogo buscado: "${catalogQ}" (normalizado: "${catNorm}")

Candidatos (titulo/meta/specs/cuerpo + señales regex):
${JSON.stringify(candidates).slice(0, 16000)}
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: system + "\n" + user }] }],
    generationConfig: { temperature: 0, responseMimeType: "application/json" }
  };
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`Gemini HTTP ${r.status}`);
  const data = await r.json();
  const txt = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  try { return JSON.parse(txt); } catch { return {}; }
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") return new Response("Use POST", { status: 405, headers: corsHeaders });
  
  const { brand, catalog } = await req.json();
  const brandQ = (brand || "").trim();
  const catalogQ = (catalog || "").trim();
  if (!catalogQ) return new Response(JSON.stringify({ error: "Catalog number is required." }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

  // 0) cache
  const cached = await supabase.from("items_cache")
    .select("result_json").eq("brand_q", brandQ).eq("catalog_q", catalogQ)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (cached.data?.result_json) {
    return new Response(JSON.stringify(cached.data.result_json), { headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  // 1) histórico
  const { data: master } = await supabase.rpc("smart_master_lookup", { brand_q: brandQ, catalog_q: catalogQ }).catch(() => ({ data: null }));
  if (master && master.match && master.match.score >= 0.8) {
    const m = master.record;
    const result = {
      marca: m.brand ?? null,
      numero_catalogo: m.catalog ?? null,
      nombre_producto: m.product_name ?? null,
      formato: m.package_format ?? m.units ?? null,
      precio_unitario: m.unit_price ?? null,
      enlace_producto: m.product_url ?? null,
      notas: m.notes ?? null,
      _source: "master",
      confidence_score: 1.0 // Master data is highly confident
    };
    await supabase.from("items_cache").insert({ brand_q: brandQ, catalog_q: catalogQ, result_json: result, source: "master" });
    return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  // 2) búsqueda DDG + scrape de páginas reales
  const links = await ddgLinks(brandQ, catalogQ, 8);
  const candidates: Candidate[] = [];
  for (const u of links) {
    const html = await fetchHtml(u);
    if (!html) continue;
    const base = extractFromHtml(html);
    candidates.push({ url: u, ...base });
  }

  // si seguimos sin señal, último recurso: páginas de búsqueda de proveedores
  if (candidates.length === 0) {
    const fallbacks = [
      `https://www.sigmaaldrich.com/ES/en/search/${encodeURIComponent(catalogQ)}?focus=products`,
      `https://www.thermofisher.com/search/results?query=${encodeURIComponent(catalogQ)}`
    ];
    for (const u of fallbacks) {
      const html = await fetchHtml(u);
      if (!html) continue;
      const base = extractFromHtml(html);
      candidates.push({ url: u, ...base });
    }
  }

  // 3) Gemini
  const llmJson = await geminiExtract(brandQ, catalogQ, candidates);

  // 4) valida que el numero_catalogo contenga el catálogo normalizado
  const ok =
    typeof llmJson?.numero_catalogo === "string" &&
    normCat(llmJson.numero_catalogo).includes(normCat(catalogQ));

  let finalJson;
  if (ok) {
    finalJson = {
      ...llmJson,
      _source: candidates.length ? "web" : "empty",
      // Si el LLM devolvió un score, úsalo. Si no, usa 0.9 ya que pasó la validación de SKU.
      confidence_score: llmJson.confidence_score || 0.9 
    };
  } else {
    finalJson = {
      marca: null, numero_catalogo: null, nombre_producto: null,
      formato: null, precio_unitario: null, enlace_producto: null,
      notas: "No se pudo confirmar el SKU solicitado con las fuentes públicas.",
      _source: candidates.length ? "web_failed" : "empty",
      confidence_score: 0.1
    };
  }

  await supabase.from("items_cache").insert({
    brand_q: brandQ, catalog_q: catalogQ,
    result_json: finalJson, source: finalJson._source
  });

  // Si el resultado no es OK, devolvemos 404 para que el cliente lo maneje como un error de búsqueda.
  if (!ok) {
    return new Response(JSON.stringify({ error: finalJson.notas }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }

  return new Response(JSON.stringify(finalJson), { headers: { "Content-Type": "application/json", ...corsHeaders } });
});