-- Sedes de LabFlow
-- =================================================================
-- Recuperada del historial de migraciones de Supabase: se aplicó en la base
-- pero nunca llegó al repo, y su ausencia hacía fallar la comprobación
-- "Supabase Preview" ("Remote migration versions not found").
--
-- El laboratorio trabaja repartido en dos sedes, CIBM y Farmacia. No son
-- dos laboratorios distintos ni dos empresas: la facturacion es unica y el
-- envio puede ir a cualquier sitio. Funcionan mas bien como dos lineas de
-- trabajo dentro de la misma casa.
--
-- Ojo con lo que esto NO es: no es un permiso. Todo el mundo sigue viendo
-- todo, y las politicas RLS no cambian. La sede solo sirve para que cada
-- cual vea por defecto lo suyo y pueda mirar lo de la otra cuando quiera.
-- Por eso el filtrado vive en la aplicacion y no en la base de datos.
--
-- La sede la marca quien pide, no donde se entrega. Una persona de CIBM
-- puede pedir algo que llega a Farmacia y el gasto sigue siendo de CIBM.

-- ------------------------------------------------------------------
-- 1) Catalogo de sedes
-- ------------------------------------------------------------------
-- accent guarda una clave de color (no un hex) para que la aplicacion la
-- resuelva con su propia paleta y siga funcionando en modo oscuro.
CREATE TABLE IF NOT EXISTS public.sites (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL UNIQUE,
  slug           text NOT NULL UNIQUE,
  accent         text NOT NULL DEFAULT 'sky',
  background_url text,
  sort_order     integer NOT NULL DEFAULT 100,
  created_at     timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.sites (name, slug, accent, sort_order) VALUES
  ('CIBM',     'cibm',     'sky',    10),
  ('Farmacia', 'farmacia', 'violet', 20)
ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------------
-- 2) Sede por defecto de cada persona
-- ------------------------------------------------------------------
-- Nula a proposito: quien no tenga sede asignada entra viendolo todo.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_site_id uuid
  REFERENCES public.sites(id) ON DELETE SET NULL;

-- ------------------------------------------------------------------
-- 3) Sede de lo que se pide, se guarda y se gasta
-- ------------------------------------------------------------------
-- Los documentos (cotizaciones, albaranes, facturas) no llevan columna:
-- heredan la sede de su solicitud, asi no hay dos sitios que puedan
-- contradecirse.
ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL;

ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL;

ALTER TABLE public.expenditures
  ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL;

-- ------------------------------------------------------------------
-- 4) Lo que ya existia es de CIBM
-- ------------------------------------------------------------------
-- Hasta hoy solo habia una direccion de envio, CIBM, asi que todo el
-- historico se asigna ahi. Los gastos que cuelgan de una solicitud toman
-- la suya; los sueltos (los importados) van tambien a CIBM.
UPDATE public.requests
   SET site_id = (SELECT id FROM public.sites WHERE slug = 'cibm')
 WHERE site_id IS NULL;

UPDATE public.inventory
   SET site_id = (SELECT id FROM public.sites WHERE slug = 'cibm')
 WHERE site_id IS NULL;

UPDATE public.expenditures e
   SET site_id = COALESCE(
         (SELECT r.site_id FROM public.requests r WHERE r.id = e.request_id),
         (SELECT id FROM public.sites WHERE slug = 'cibm')
       )
 WHERE e.site_id IS NULL;

-- ------------------------------------------------------------------
-- 5) Indices
-- ------------------------------------------------------------------
-- El filtro por sede se aplica en casi todas las listas.
CREATE INDEX IF NOT EXISTS requests_site_id_idx     ON public.requests(site_id);
CREATE INDEX IF NOT EXISTS inventory_site_id_idx    ON public.inventory(site_id);
CREATE INDEX IF NOT EXISTS expenditures_site_id_idx ON public.expenditures(site_id);

-- ------------------------------------------------------------------
-- 6) Permisos y politicas
-- ------------------------------------------------------------------
-- Ver las sedes lo necesita cualquiera para poder cambiar de una a otra.
-- Crearlas o editarlas es cosa de administracion.
INSERT INTO public.permissions (key, label, description, category, sort_order) VALUES
  ('sites.manage', 'Gestionar sedes', 'Anadir y editar las sedes del laboratorio', 'Maestros', 165)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, allowed)
SELECT r, 'sites.manage', (r = 'Admin')
  FROM unnest(ARRAY['Admin', 'Account Manager', 'Requester']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sites_select ON public.sites;
CREATE POLICY sites_select ON public.sites
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS sites_write ON public.sites;
CREATE POLICY sites_write ON public.sites
  FOR ALL TO authenticated
  USING (public.has_permission('sites.manage'))
  WITH CHECK (public.has_permission('sites.manage'));
