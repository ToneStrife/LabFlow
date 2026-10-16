-- Plantilla «PO Request» (Cómprame) al estilo del correo a gerentes de cuenta:
-- saludo, investigador / proyecto / entidad, tabla de artículos y aviso de no contactar al proveedor.

UPDATE public.email_templates
SET
  subject_template = 'CÓMPRAME {{request.project_codes}} — {{request.id}}',
  body_template = E'Hola, {{account_manager.first_name}},\n\nTe remito información para la tramitación del CÓMPRAME correspondiente:\n\nInvestigador: {{project.investigador}}\nProyecto: {{request.project_codes}}\nEntidad: {{project.entidad}}\n{{items_list}}\n⚠️ NOTA IMPORTANTE: No se debe enviar correo a la empresa proveedora, para evitar pedidos duplicados.\nSaludos,\n{{actor.full_name}}'
WHERE template_name = 'PO Request';
