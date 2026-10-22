-- Confirmación de pedido al proveedor: nº de pedido, tabla de productos
-- y direcciones de facturación y envío. El presupuesto y el CÓMPRAME se
-- adjuntan desde la app (quote_url / po_url).
--
-- El cuerpo editable usa marcadores; el HTML de tabla y cajas lo monta
-- src/utils/email-blocks.ts (ReactQuill se come tablas al guardar).
-- Idempotente.

UPDATE public.email_templates
SET
  subject_template = $s$Confirmación de pedido {{request.po_number | "s/n"}} — {{request.id}} {{vendor.name}}$s$,
  body_template = $b$Estimados señores de {{vendor.name}},

Confirmamos el pedido nº {{request.po_number | "s/n"}} (solicitud {{request.id}}).
Adjunto encontrará el presupuesto y el CÓMPRAME.

{{items_table}}
{{billing_address_box}}
{{shipping_box}}
Atentamente,

{{actor.full_name}}$b$
WHERE template_name = 'Order Confirmation';
