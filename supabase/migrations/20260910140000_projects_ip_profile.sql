-- IP (Investigador Principal) del proyecto: quien aprueba las solicitudes
-- asociadas a ese proyecto.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS ip_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS projects_ip_profile_id_idx
  ON public.projects (ip_profile_id);

COMMENT ON COLUMN public.projects.ip_profile_id IS
  'Perfil del IP del proyecto; puede aprobar solicitudes de este proyecto';
