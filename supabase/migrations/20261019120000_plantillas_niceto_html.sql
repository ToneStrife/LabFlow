-- Plantillas Quote Request y PO Request con los bloques visuales en codigo.
--
-- El cuerpo editable se queda en texto plano con marcadores. El diseno (tabla
-- de articulos, caja de facturacion, direccion de envio, aviso) lo monta
-- src/utils/email-blocks.ts, porque el editor del panel de Admin (ReactQuill)
-- se come las tablas y los estilos al guardar.
--
-- Idempotente.

UPDATE public.email_templates
SET
  subject_template = 'Solicitud de presupuesto — {{vendor.name}} ({{request.id}})',
  body_template = E'Estimados señores de {{vendor.name}},\n\nRogamos nos envíen presupuesto de los siguientes artículos:\n\n{{items_table}}\n{{billing_box}}\n{{shipping_box}}\nAtentamente,\n\n{{actor.full_name}}'
WHERE template_name = 'Quote Request';

UPDATE public.email_templates
SET
  subject_template = 'CÓMPRAME {{request.project_codes}} — {{request.id}}',
  body_template = E'Hola, {{account_manager.first_name}},\n\nTe remito información para la tramitación del CÓMPRAME correspondiente:\n\n{{project_box}}\n{{items_table}}\n{{warning_box}}\nSaludos,\n\n{{actor.full_name}}'
WHERE template_name = 'PO Request';

-- Reordenamiento de inventario: mismo modelo que el presupuesto, porque va al
-- mismo sitio (el proveedor) y pide lo mismo.
UPDATE public.email_templates
SET
  subject_template = 'Solicitud de presupuesto (reposición) — {{vendor.name}} ({{request.id}})',
  body_template = E'Estimados señores de {{vendor.name}},\n\nRogamos nos envíen presupuesto para la reposición de los siguientes artículos:\n\n{{items_table}}\n{{billing_box}}\n{{shipping_box}}\nNotas: {{request.notes | "Sin notas adicionales."}}\n\nAtentamente,\n\n{{actor.full_name}}'
WHERE template_name = 'Reorder Request';
