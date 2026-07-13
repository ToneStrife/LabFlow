-- Incluir código(s) de proyecto en la plantilla PO Request si aún no está presente.
UPDATE email_templates
SET body_template = REPLACE(
  body_template,
  'al proyecto',
  'al proyecto {{request.project_codes}}'
)
WHERE template_name = 'PO Request'
  AND body_template NOT LIKE '%{{request.project_codes}}%';
