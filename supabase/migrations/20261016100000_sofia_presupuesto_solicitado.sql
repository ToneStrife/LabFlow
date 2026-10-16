-- Sofía decía "cotización solicitada". En pantalla el segundo estado es "Presupuesto solicitado".
CREATE OR REPLACE FUNCTION public.sofia_ultimos_pedidos(p_token text, p_texto text DEFAULT NULL, p_mios boolean DEFAULT false, p_n integer DEFAULT 5)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  d     public.sofia_devices;
  v_res jsonb;
BEGIN
  d := public.sofia_device_by_token(p_token);
  p_n := least(greatest(coalesce(p_n, 5), 1), 10);
  WITH formas AS (
    SELECT public.sofia_tokens(f) AS q FROM unnest(string_to_array(coalesce(p_texto, ''), '|')) f WHERE trim(f) <> ''
  ),
  cand AS (
    SELECT r.*,
           (SELECT string_agg(ri.quantity || ' x ' || ri.product_name, '; ' ORDER BY ri.product_name)
              FROM public.request_items ri WHERE ri.request_id = r.id) AS lineas,
           CASE WHEN NOT EXISTS (SELECT 1 FROM formas) THEN 1
                ELSE (SELECT max(public.sofia_parecido(f.q, public.sofia_tokens(ri.product_name || ' ' || coalesce(ri.catalog_number, '') || ' ' || coalesce(ri.brand, ''))))
                        FROM public.request_items ri, formas f WHERE ri.request_id = r.id) END AS score
      FROM public.requests r
     WHERE NOT p_mios OR r.requester_id = d.owner_id
  )
  SELECT coalesce(jsonb_agg(x), '[]'::jsonb) INTO v_res FROM (
    SELECT jsonb_build_object(
             'numero',    coalesce(c.request_number, left(c.id::text, 8)),
             'fecha',     to_char(c.created_at, 'YYYY-MM-DD'),
             'estado',    CASE c.status::text
                            WHEN 'Pending' THEN 'pendiente de presupuesto'
                            WHEN 'Quote Requested' THEN 'presupuesto solicitado'
                            WHEN 'PO Requested' THEN 'orden de compra pedida'
                            WHEN 'Ordered' THEN 'pedido al proveedor'
                            WHEN 'Received' THEN 'recibido'
                            WHEN 'Denied' THEN 'denegado'
                            WHEN 'Cancelled' THEN 'cancelado'
                            ELSE c.status::text END,
             'proveedor', v.name,
             'quien',     trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')),
             'que',       left(coalesce(c.lineas, ''), 160)
           ) AS x
      FROM cand c
      LEFT JOIN public.vendors v ON v.id = c.vendor_id
      LEFT JOIN public.profiles p ON p.id = c.requester_id
     WHERE c.score >= 0.5
     ORDER BY c.created_at DESC
     LIMIT p_n
  ) t;
  RETURN jsonb_build_object('pedidos', v_res);
END;
$$;
