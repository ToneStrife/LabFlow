-- El stock antiguo no tenía sede. Se le pone la de la solicitud con la que se recibió.
-- Si no hay recepción, la de la solicitud que sigue viva (no denegada ni cancelada),
-- y solo cuando esa sede es una sola.

WITH recibidos AS (
  SELECT i.id,
         array_agg(DISTINCT coalesce(r.sede_id, sa.sede_id))
           FILTER (WHERE coalesce(r.sede_id, sa.sede_id) IS NOT NULL) AS sedes
  FROM public.inventory i
  JOIN public.request_items ri
    ON ri.catalog_number = i.catalog_number
   AND ri.product_name = i.product_name
  JOIN public.received_items rec
    ON rec.request_item_id = ri.id
   AND rec.quantity_received <> 0
  JOIN public.packing_slips ps ON ps.id = rec.slip_id
  JOIN public.requests r ON r.id = ps.request_id
  LEFT JOIN public.shipping_addresses sa ON sa.id = r.shipping_address_id
  WHERE i.sede_id IS NULL
  GROUP BY i.id
),
pedidos AS (
  SELECT i.id,
         array_agg(DISTINCT coalesce(r.sede_id, sa.sede_id))
           FILTER (WHERE coalesce(r.sede_id, sa.sede_id) IS NOT NULL) AS sedes
  FROM public.inventory i
  JOIN public.request_items ri
    ON ri.catalog_number = i.catalog_number
   AND ri.product_name = i.product_name
  JOIN public.requests r ON r.id = ri.request_id
  LEFT JOIN public.shipping_addresses sa ON sa.id = r.shipping_address_id
  WHERE i.sede_id IS NULL
    AND r.status NOT IN ('Denied', 'Cancelled')
  GROUP BY i.id
),
destino AS (
  SELECT id, sedes[1] AS sede
  FROM recibidos
  WHERE cardinality(sedes) = 1
  UNION
  SELECT p.id, p.sedes[1]
  FROM pedidos p
  WHERE cardinality(p.sedes) = 1
    AND NOT EXISTS (
      SELECT 1 FROM recibidos r
      WHERE r.id = p.id AND cardinality(r.sedes) = 1
    )
)
UPDATE public.inventory i
SET sede_id = d.sede,
    last_updated = now()
FROM destino d
WHERE i.id = d.id
  AND i.sede_id IS NULL
  AND d.sede IS NOT NULL;
