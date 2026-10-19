-- Cuentas SMTP sin Edge Function, y panel de Admin por permiso.
-- =================================================================
-- get-smtp-accounts / upsert-smtp-account no están desplegadas: el navegador
-- recibe "Failed to send a request to the Edge Function" y nadie puede guardar
-- la contraseña de go.ugr.es. La tabla ya tiene RLS y la contraseña no es
-- seleccionable; la app escribe ahí directamente.
--
-- has_password es una columna generada: dice si hay contraseña sin devolverla.
-- smtp.manage deja configurar cualquier buzón. Sin ese permiso, cada persona
-- solo toca la fila de su propio correo (perfil).
--
-- Niceto no tiene que ser administrador para proyectos, direcciones, plantillas,
-- gerentes de cuenta ni el correo. Esas casillas le quedan concedidas aunque
-- se le quite el rol Admin.

-- ------------------------------------------------------------------
-- 1) Indicador de contraseña, sin exponer el secreto
-- ------------------------------------------------------------------
ALTER TABLE public.smtp_accounts
  ADD COLUMN IF NOT EXISTS has_password boolean
  GENERATED ALWAYS AS (length(btrim(coalesce(smtp_password, ''))) > 0) STORED;

GRANT SELECT (has_password) ON public.smtp_accounts TO authenticated;

-- ------------------------------------------------------------------
-- 2) Quién puede ver o cambiar una cuenta
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_manage_smtp_account(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      public.is_admin()
      OR public.has_permission('smtp.manage')
      OR lower(btrim(coalesce(p_email, ''))) = (
        SELECT lower(btrim(coalesce(pr.email, '')))
        FROM public.profiles pr
        WHERE pr.id = auth.uid()
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_smtp_account(text) TO authenticated;

DROP POLICY IF EXISTS smtp_accounts_select ON public.smtp_accounts;
CREATE POLICY smtp_accounts_select ON public.smtp_accounts
  FOR SELECT TO authenticated
  USING (public.can_manage_smtp_account(email));

DROP POLICY IF EXISTS smtp_accounts_insert ON public.smtp_accounts;
CREATE POLICY smtp_accounts_insert ON public.smtp_accounts
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_smtp_account(email));

DROP POLICY IF EXISTS smtp_accounts_update ON public.smtp_accounts;
CREATE POLICY smtp_accounts_update ON public.smtp_accounts
  FOR UPDATE TO authenticated
  USING (public.can_manage_smtp_account(email))
  WITH CHECK (public.can_manage_smtp_account(email));

DROP POLICY IF EXISTS smtp_accounts_delete ON public.smtp_accounts;
CREATE POLICY smtp_accounts_delete ON public.smtp_accounts
  FOR DELETE TO authenticated
  USING (public.is_admin() OR public.has_permission('smtp.manage'));

-- ------------------------------------------------------------------
-- 3) Permiso nuevo. El administrador lo tiene; el resto, no, salvo excepción.
-- ------------------------------------------------------------------
INSERT INTO public.permissions (key, label, description, category, sort_order) VALUES
  ('smtp.manage', 'Gestionar cuentas de correo', 'Guardar el correo go.ugr.es y su contraseña SMTP', 'Maestros', 175)
ON CONFLICT (key) DO UPDATE
  SET label = EXCLUDED.label,
      description = EXCLUDED.description,
      category = EXCLUDED.category,
      sort_order = EXCLUDED.sort_order;

INSERT INTO public.role_permissions (role, permission_key, allowed) VALUES
  ('Admin', 'smtp.manage', true),
  ('Account Manager', 'smtp.manage', false),
  ('Requester', 'smtp.manage', false)
ON CONFLICT (role, permission_key) DO UPDATE
  SET allowed = EXCLUDED.allowed;

-- Niceto edita lo operativo sin el rol Administrador. No incluye usuarios ni
-- la matriz de permisos.
INSERT INTO public.user_permissions (user_id, permission_key, allowed)
SELECT p.id, perm.key, true
FROM public.profiles p
CROSS JOIN (
  VALUES
    ('projects.manage'),
    ('account_managers.manage'),
    ('addresses.manage'),
    ('email_templates.manage'),
    ('smtp.manage')
) AS perm(key)
WHERE lower(btrim(coalesce(p.email, ''))) = 'niceto@go.ugr.es'
   OR lower(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) LIKE '%niceto%'
ON CONFLICT (user_id, permission_key) DO UPDATE
  SET allowed = true,
      updated_at = now();
