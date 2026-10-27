-- Laboratorios (grupos de investigación), sedes, miembros y alcance por lab.
-- Seed FarBioQ con sedes cibm/farmacia (ids reservados).

-- ------------------------------------------------------------------
-- 1) Tablas labs / sedes / lab_members
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.labs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  logo_url text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sedes (
  id text PRIMARY KEY,
  lab_id uuid NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  name text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('cibm', 'farmacia', 'otro')),
  color text NOT NULL DEFAULT '#2563eb',
  descripcion text,
  hero_image_url text,
  hero_gradient text NOT NULL DEFAULT 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sedes_lab_id_idx ON public.sedes (lab_id);
CREATE INDEX IF NOT EXISTS sedes_tipo_idx ON public.sedes (tipo);

CREATE TABLE IF NOT EXISTS public.lab_members (
  lab_id uuid NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('member', 'admin_lab', 'lab_order_manager')),
  smtp_from text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lab_id, user_id)
);

CREATE INDEX IF NOT EXISTS lab_members_user_id_idx ON public.lab_members (user_id);

COMMENT ON TABLE public.labs IS 'Laboratorio / grupo de investigación (ej. FarBioQ)';
COMMENT ON TABLE public.sedes IS 'Sedes de un laboratorio; id único global; tipo farmacia/cibm/otro';
COMMENT ON TABLE public.lab_members IS 'Membresía y rol por laboratorio (member, admin_lab, lab_order_manager)';

-- ------------------------------------------------------------------
-- 2) Columnas de alcance
-- ------------------------------------------------------------------
ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS lab_id uuid REFERENCES public.labs(id),
  ADD COLUMN IF NOT EXISTS sede_id text;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS lab_id uuid REFERENCES public.labs(id);

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS lab_id uuid REFERENCES public.labs(id),
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'global';

ALTER TABLE public.vendors
  DROP CONSTRAINT IF EXISTS vendors_scope_check;
ALTER TABLE public.vendors
  ADD CONSTRAINT vendors_scope_check CHECK (scope IN ('global', 'lab'));

CREATE TABLE IF NOT EXISTS public.vendor_lab_overrides (
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  lab_id uuid NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  email text,
  email_presupuesto text,
  email_pedido text,
  contact_person text,
  phone text,
  notes text,
  disabled_for_lab boolean NOT NULL DEFAULT false,
  PRIMARY KEY (vendor_id, lab_id)
);

ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS lab_id uuid REFERENCES public.labs(id) ON DELETE CASCADE;

-- Permitir varias plantillas del mismo nombre (global + por lab)
ALTER TABLE public.email_templates
  DROP CONSTRAINT IF EXISTS email_templates_template_name_key;
DROP INDEX IF EXISTS email_templates_template_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS email_templates_name_lab_uidx
  ON public.email_templates (template_name, COALESCE(lab_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ------------------------------------------------------------------
-- 3) Seed FarBioQ
-- ------------------------------------------------------------------
INSERT INTO public.labs (id, name, slug, description, logo_url, activo)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'FarBioQ',
  'farbioq',
  'Farmacología y Bioquímica de Enfermedades Inmunomediadas',
  NULL,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  activo = true;

-- Mantener ids cibm/farmacia para FarBioQ (compatibilidad)
INSERT INTO public.sedes (id, lab_id, name, tipo, color, descripcion, hero_gradient)
VALUES
  (
    'cibm',
    'a0000000-0000-4000-8000-000000000001',
    'CIBM',
    'cibm',
    '#2563eb',
    'Centro de Investigación Biomédica · Universidad de Granada',
    'linear-gradient(135deg, #1e3a8a 0%, #2563eb 42%, #60a5fa 100%)'
  ),
  (
    'farmacia',
    'a0000000-0000-4000-8000-000000000001',
    'Farmacia',
    'farmacia',
    '#9333ea',
    'Facultad de Farmacia · Universidad de Granada',
    'linear-gradient(135deg, #581c87 0%, #9333ea 38%, #a855f7 62%, #c4b5fd 100%)'
  )
ON CONFLICT (id) DO UPDATE SET
  lab_id = EXCLUDED.lab_id,
  name = EXCLUDED.name,
  tipo = EXCLUDED.tipo,
  color = EXCLUDED.color,
  descripcion = EXCLUDED.descripcion,
  hero_gradient = EXCLUDED.hero_gradient,
  activo = true;

-- Todos los perfiles actuales → miembros FarBioQ; Admins → admin_lab
INSERT INTO public.lab_members (lab_id, user_id, role)
SELECT
  'a0000000-0000-4000-8000-000000000001',
  p.id,
  CASE WHEN p.role::text = 'Admin' THEN 'admin_lab' ELSE 'member' END
FROM public.profiles p
ON CONFLICT (lab_id, user_id) DO NOTHING;

-- Niceto → lab_order_manager en FarBioQ
UPDATE public.lab_members lm
SET role = 'lab_order_manager',
    smtp_from = 'niceto@go.ugr.es'
FROM public.profiles p
WHERE lm.user_id = p.id
  AND lm.lab_id = 'a0000000-0000-4000-8000-000000000001'
  AND (
    lower(coalesce(p.email, '')) IN ('niceto@go.ugr.es', 'niceto@ugr.es')
    OR lower(coalesce(p.first_name, '')) LIKE '%niceto%'
  );

-- ------------------------------------------------------------------
-- 4) Backfill requests / projects
-- ------------------------------------------------------------------
UPDATE public.requests r
SET sede_id = COALESCE(
  r.sede_id,
  (
    SELECT a.sede_id
    FROM public.shipping_addresses a
    WHERE a.id = r.shipping_address_id
      AND a.sede_id IS NOT NULL
    LIMIT 1
  ),
  'cibm'
)
WHERE r.sede_id IS NULL;

UPDATE public.requests r
SET lab_id = COALESCE(
  r.lab_id,
  (SELECT s.lab_id FROM public.sedes s WHERE s.id = r.sede_id LIMIT 1),
  'a0000000-0000-4000-8000-000000000001'
)
WHERE r.lab_id IS NULL;

UPDATE public.projects
SET lab_id = 'a0000000-0000-4000-8000-000000000001'
WHERE lab_id IS NULL;

UPDATE public.vendors
SET scope = 'global', lab_id = NULL
WHERE scope IS NULL OR scope = '';

-- ------------------------------------------------------------------
-- 5) Helpers de acceso
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.am_i_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND coalesce(is_owner, false)
  );
$$;

CREATE OR REPLACE FUNCTION public.user_in_lab(p_lab_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.am_i_owner()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.lab_members m
      WHERE m.lab_id = p_lab_id AND m.user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.user_lab_role(p_lab_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.role
  FROM public.lab_members m
  WHERE m.lab_id = p_lab_id AND m.user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_lab_manager(p_lab_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.am_i_owner()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.lab_members m
      WHERE m.lab_id = p_lab_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin_lab', 'lab_order_manager')
    );
$$;

CREATE OR REPLACE FUNCTION public.sede_lab_id(p_sede_id text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lab_id FROM public.sedes WHERE id = p_sede_id LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.user_in_lab(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_lab_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_lab_manager(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sede_lab_id(text) TO authenticated;

-- ------------------------------------------------------------------
-- 6) RLS labs / sedes / members
-- ------------------------------------------------------------------
ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sedes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_lab_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS labs_select ON public.labs;
CREATE POLICY labs_select ON public.labs
  FOR SELECT TO authenticated
  USING (public.am_i_owner() OR public.is_admin() OR public.user_in_lab(id));

DROP POLICY IF EXISTS labs_write ON public.labs;
CREATE POLICY labs_write ON public.labs
  FOR ALL TO authenticated
  USING (public.am_i_owner() OR public.is_admin())
  WITH CHECK (public.am_i_owner() OR public.is_admin());

DROP POLICY IF EXISTS sedes_select ON public.sedes;
CREATE POLICY sedes_select ON public.sedes
  FOR SELECT TO authenticated
  USING (public.am_i_owner() OR public.is_admin() OR public.user_in_lab(lab_id));

DROP POLICY IF EXISTS sedes_write ON public.sedes;
CREATE POLICY sedes_write ON public.sedes
  FOR ALL TO authenticated
  USING (public.am_i_owner() OR public.is_admin())
  WITH CHECK (public.am_i_owner() OR public.is_admin());

DROP POLICY IF EXISTS lab_members_select ON public.lab_members;
CREATE POLICY lab_members_select ON public.lab_members
  FOR SELECT TO authenticated
  USING (
    public.am_i_owner() OR public.is_admin()
    OR user_id = auth.uid()
    OR public.user_in_lab(lab_id)
  );

DROP POLICY IF EXISTS lab_members_write ON public.lab_members;
CREATE POLICY lab_members_write ON public.lab_members
  FOR ALL TO authenticated
  USING (public.am_i_owner() OR public.is_admin())
  WITH CHECK (public.am_i_owner() OR public.is_admin());

DROP POLICY IF EXISTS vendor_overrides_select ON public.vendor_lab_overrides;
CREATE POLICY vendor_overrides_select ON public.vendor_lab_overrides
  FOR SELECT TO authenticated
  USING (public.am_i_owner() OR public.is_admin() OR public.user_in_lab(lab_id));

DROP POLICY IF EXISTS vendor_overrides_write ON public.vendor_lab_overrides;
CREATE POLICY vendor_overrides_write ON public.vendor_lab_overrides
  FOR ALL TO authenticated
  USING (public.am_i_owner() OR public.is_admin() OR public.is_lab_manager(lab_id))
  WITH CHECK (public.am_i_owner() OR public.is_admin() OR public.is_lab_manager(lab_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.labs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sedes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_lab_overrides TO authenticated;

-- ------------------------------------------------------------------
-- 7) RLS requests / inventory / vendors / email_templates / projects
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS requests_select ON public.requests;
CREATE POLICY requests_select ON public.requests
  FOR SELECT TO authenticated
  USING (
    public.am_i_owner()
    OR public.is_admin()
    OR requester_id = auth.uid()
    OR (lab_id IS NOT NULL AND public.user_in_lab(lab_id))
  );

DROP POLICY IF EXISTS projects_select ON public.projects;
CREATE POLICY projects_select ON public.projects
  FOR SELECT TO authenticated
  USING (
    public.am_i_owner()
    OR public.is_admin()
    OR lab_id IS NULL
    OR public.user_in_lab(lab_id)
  );

-- Inventory: visible si sede del lab del usuario, o sin sede, o admin
DROP POLICY IF EXISTS inventory_authenticated_select ON public.inventory;
DROP POLICY IF EXISTS inventory_select ON public.inventory;
CREATE POLICY inventory_select ON public.inventory
  FOR SELECT TO authenticated
  USING (
    public.am_i_owner()
    OR public.is_admin()
    OR sede_id IS NULL
    OR public.user_in_lab(public.sede_lab_id(sede_id))
  );

-- Vendors: globales + del lab del usuario
DROP POLICY IF EXISTS vendors_select ON public.vendors;
CREATE POLICY vendors_select ON public.vendors
  FOR SELECT TO authenticated
  USING (
    public.am_i_owner()
    OR public.is_admin()
    OR scope = 'global'
    OR (lab_id IS NOT NULL AND public.user_in_lab(lab_id))
  );

-- Email templates: globales + del lab
DROP POLICY IF EXISTS email_templates_select ON public.email_templates;
CREATE POLICY email_templates_select ON public.email_templates
  FOR SELECT TO authenticated
  USING (
    public.am_i_owner()
    OR public.is_admin()
    OR lab_id IS NULL
    OR public.user_in_lab(lab_id)
  );

DROP POLICY IF EXISTS email_templates_write ON public.email_templates;
CREATE POLICY email_templates_write ON public.email_templates
  FOR ALL TO authenticated
  USING (
    public.has_permission('email_templates.manage')
    OR (lab_id IS NOT NULL AND public.is_lab_manager(lab_id))
  )
  WITH CHECK (
    public.has_permission('email_templates.manage')
    OR (lab_id IS NOT NULL AND public.is_lab_manager(lab_id))
  );

-- ------------------------------------------------------------------
-- 8) RPC crear laboratorio (atómica)
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_lab_with_sedes(
  p_name text,
  p_slug text,
  p_description text DEFAULT NULL,
  p_logo_url text DEFAULT NULL,
  p_members jsonb DEFAULT '[]'::jsonb,
  p_sedes jsonb DEFAULT '[]'::jsonb
)
RETURNS public.labs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lab public.labs;
  v_member jsonb;
  v_sede jsonb;
  v_sede_id text;
  v_slug text;
BEGIN
  IF NOT (public.am_i_owner() OR public.is_admin()) THEN
    RAISE EXCEPTION 'Solo un administrador puede crear laboratorios';
  END IF;

  v_slug := lower(trim(p_slug));
  IF v_slug = '' OR p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Nombre y slug son obligatorios';
  END IF;
  IF jsonb_array_length(COALESCE(p_sedes, '[]'::jsonb)) < 1 THEN
    RAISE EXCEPTION 'Hace falta al menos una sede';
  END IF;

  INSERT INTO public.labs (name, slug, description, logo_url, activo)
  VALUES (trim(p_name), v_slug, nullif(trim(COALESCE(p_description, '')), ''), nullif(trim(COALESCE(p_logo_url, '')), ''), true)
  RETURNING * INTO v_lab;

  FOR v_sede IN SELECT * FROM jsonb_array_elements(p_sedes)
  LOOP
    v_sede_id := nullif(trim(COALESCE(v_sede->>'id', '')), '');
    IF v_sede_id IS NULL THEN
      v_sede_id := v_slug || '-' || lower(regexp_replace(COALESCE(v_sede->>'tipo', 'otro'), '[^a-z0-9]+', '-', 'g'));
    END IF;
    INSERT INTO public.sedes (id, lab_id, name, tipo, color, descripcion, hero_gradient, activo)
    VALUES (
      v_sede_id,
      v_lab.id,
      trim(COALESCE(v_sede->>'name', v_sede_id)),
      COALESCE(NULLIF(v_sede->>'tipo', ''), 'otro'),
      COALESCE(NULLIF(v_sede->>'color', ''), '#2563eb'),
      nullif(trim(COALESCE(v_sede->>'descripcion', '')), ''),
      COALESCE(NULLIF(v_sede->>'hero_gradient', ''), 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)'),
      true
    );
  END LOOP;

  FOR v_member IN SELECT * FROM jsonb_array_elements(COALESCE(p_members, '[]'::jsonb))
  LOOP
    INSERT INTO public.lab_members (lab_id, user_id, role, smtp_from)
    VALUES (
      v_lab.id,
      (v_member->>'user_id')::uuid,
      COALESCE(NULLIF(v_member->>'role', ''), 'member'),
      nullif(trim(COALESCE(v_member->>'smtp_from', '')), '')
    )
    ON CONFLICT (lab_id, user_id) DO UPDATE SET
      role = EXCLUDED.role,
      smtp_from = COALESCE(EXCLUDED.smtp_from, public.lab_members.smtp_from);
  END LOOP;

  RETURN v_lab;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_lab_with_sedes(text, text, text, text, jsonb, jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
