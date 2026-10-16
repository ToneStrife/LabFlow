-- Plantilla «Quote Request» al estilo del correo de presupuesto de Niceto:
-- saludo al proveedor, tabla de artículos, datos de facturación y dirección de envío.

UPDATE public.email_templates
SET
  subject_template = 'Solicitud de presupuesto — {{vendor.name}} ({{request.id}})',
  body_template = E'Estimados señores de {{vendor.name}},\n\nRogamos nos envíen presupuesto de los siguientes artículos:\n\n{{items_list}}\n\nDATOS DE FACTURACIÓN:\n\nInvestigador: {{project.investigador}}\nProyecto/Ref: {{request.project_codes}}\nEntidad: {{project.entidad}}\nCIF: {{project.entidad_cif}}\n\nDIRECCIÓN DE ENVÍO:\n\n{{shipping_address}}\n\nAtentamente,\n\n{{actor.full_name}}'
WHERE template_name = 'Quote Request';
