-- Proyectos con vigencia: se pueden desactivar o dejar fuera de fechas.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS fecha_inicio date,
  ADD COLUMN IF NOT EXISTS fecha_fin date,
  ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.projects.fecha_inicio IS 'Inicio de vigencia del proyecto (opcional)';
COMMENT ON COLUMN public.projects.fecha_fin IS 'Fin de vigencia del proyecto (opcional)';
COMMENT ON COLUMN public.projects.activo IS 'Si false, no aparece en selectores de pedidos nuevos';
