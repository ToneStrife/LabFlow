let result = { ...aiData };

if (
  result.product_name === "No disponible" ||
  !result.product_name ||
  !result.unit_price ||
  !result.link
) {
  const { inv, req } = await fuzzySearch(supabase, `${brand ?? ""} ${catalogNumber ?? productName ?? ""}`);
  const best = inv?.[0] ?? req?.[0];

  if (best) {
    result = {
      product_name: result.product_name !== "No disponible"
        ? result.product_name
        : best.product_name,
      catalog_number: result.catalog_number ?? best.catalog_number,
      brand: result.brand ?? best.brand,
      unit_price: result.unit_price ?? best.unit_price,
      format: result.format ?? best.format,
      link: result.link ?? best.link,
      source: result.source === "AI" ? "AI+DB" : "DB",
      notes: result.notes ?? null,
    };
  }
}

return result;
