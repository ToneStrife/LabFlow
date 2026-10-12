-- Renombrado visible: Sofía pasa a llamarse SofIA (textos de permisos y categoría).
-- Idempotente: se puede ejecutar más de una vez.
UPDATE public.permissions SET label = 'Usar SofIA', description = 'Ver Mis SofIAs y emparejar un asistente de voz', category = 'SofIA' WHERE key = 'sofia.use';
UPDATE public.permissions SET label = 'Publicar firmware de SofIA', category = 'SofIA' WHERE key = 'sofia.firmware';
