-- Asunto del Cómprame: proyecto, nº solicitud y nombre del proveedor.
UPDATE public.email_templates
SET subject_template = 'CÓMPRAME {{request.project_codes}} {{request.id}} {{vendor.name}}'
WHERE template_name = 'PO Request';
