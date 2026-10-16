-- Entidad financiadora/gestora del proyecto y su CIF asociado.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS entidad text,
  ADD COLUMN IF NOT EXISTS entidad_cif text;

COMMENT ON COLUMN public.projects.entidad IS
  'Entidad asociada al proyecto (financiadora o gestora)';

COMMENT ON COLUMN public.projects.entidad_cif IS
  'CIF de la entidad asociada al proyecto';
