-- Sede en inventario: el mismo SKU puede existir por sede.
-- La RPC de upsert pasa a emparejar también por sede_id.

ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS sede_id text;

COMMENT ON COLUMN public.inventory.sede_id IS
  'Sede a la que pertenece el stock; NULL = sin asignar (visible solo en Todas)';

-- Sustituir todas las firmas previas de la RPC (el upsert antiguo ignoraba sede).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'add_or_update_inventory_item'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', r.sig);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.add_or_update_inventory_item(
  product_name_in text,
  catalog_number_in text,
  brand_in text DEFAULT NULL,
  quantity_in numeric DEFAULT 0,
  unit_price_in numeric DEFAULT NULL,
  format_in text DEFAULT NULL,
  sede_id_in text DEFAULT NULL
)
RETURNS public.inventory
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.inventory;
BEGIN
  SELECT * INTO row
  FROM public.inventory
  WHERE product_name = product_name_in
    AND catalog_number = catalog_number_in
    AND sede_id IS NOT DISTINCT FROM sede_id_in
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.inventory SET
      quantity = quantity + quantity_in,
      brand = COALESCE(brand_in, brand),
      unit_price = COALESCE(unit_price_in, unit_price),
      format = COALESCE(format_in, format),
      last_updated = now()
    WHERE id = row.id
    RETURNING * INTO row;
  ELSE
    INSERT INTO public.inventory (
      product_name,
      catalog_number,
      brand,
      quantity,
      unit_price,
      format,
      sede_id
    ) VALUES (
      product_name_in,
      catalog_number_in,
      brand_in,
      quantity_in,
      unit_price_in,
      format_in,
      sede_id_in
    )
    RETURNING * INTO row;
  END IF;

  RETURN row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_or_update_inventory_item(
  text, text, text, numeric, numeric, text, text
) TO authenticated;
