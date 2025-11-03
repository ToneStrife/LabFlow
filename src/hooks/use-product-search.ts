// Sanitiza el término (evita saltos de línea y espacios dobles)
const norm = (s: string) => (s ?? "").replace(/\s+/g, " ").trim();

export async function fuzzySearch(supabase, rawQuery: string) {
  const term = norm(rawQuery);

  // INVENTORY
  const { data: inv, error: invErr } = await supabase.rpc('search_inventory', {
    term,
    min_score: 0.3,
    max_results: 5,
  });
  if (invErr) console.error('Error search_inventory:', invErr);

  // REQUEST_ITEMS
  const { data: req, error: reqErr } = await supabase.rpc('search_request_items', {
    term,
    min_score: 0.3,
    max_results: 5,
  });
  if (reqErr) console.error('Error search_request_items:', reqErr);

  return { inv: inv ?? [], req: req ?? [] };
}
