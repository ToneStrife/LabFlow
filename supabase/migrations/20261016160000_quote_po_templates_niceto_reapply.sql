-- Reaplica plantillas Quote Request y PO Request al estilo Niceto.
-- Idempotente: cubre entornos donde 20261016140000 / 20261016150000 no se
-- aplicaron, o donde Admin guardó de nuevo el texto antiguo.

UPDATE public.email_templates
SET
  subject_template = 'Solicitud de presupuesto — {{vendor.name}} ({{request.id}})',
  body_template = E'Estimados señores de {{vendor.name}},\n\nRogamos nos envíen presupuesto de los siguientes artículos:\n\n{{items_list}}\n\nDATOS DE FACTURACIÓN:\n\nInvestigador: {{project.investigador}}\nProyecto/Ref: {{request.project_codes}}\nEntidad: {{project.entidad}}\nCIF: {{project.entidad_cif}}\n\nDIRECCIÓN DE ENVÍO:\n\n{{shipping_address}}\n\nAtentamente,\n\n{{actor.full_name}}'
WHERE template_name = 'Quote Request';

UPDATE public.email_templates
SET
  subject_template = 'CÓMPRAME {{request.project_codes}} — {{request.id}}',
  body_template = E'Hola, {{account_manager.first_name}},\n\nTe remito información para la tramitación del CÓMPRAME correspondiente:\n\nInvestigador: {{project.investigador}}\nProyecto: {{request.project_codes}}\nEntidad: {{project.entidad}}\n{{items_list}}\n⚠️ NOTA IMPORTANTE: No se debe enviar correo a la empresa proveedora, para evitar pedidos duplicados.\nSaludos,\n{{actor.full_name}}'
WHERE template_name = 'PO Request';
