-- Cuentas SMTP alternativas (p. ej. niceto@go.ugr.es).
-- La contraseña nunca se expone al cliente: revoke SELECT de la columna;
-- get/upsert van por Edge Functions con service role (respuesta enmascarada).

CREATE TABLE IF NOT EXISTS public.smtp_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  smtp_host text,
  smtp_user text NOT NULL,
  smtp_password text NOT NULL DEFAULT '',
  label text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT smtp_accounts_email_unique UNIQUE (email),
  CONSTRAINT smtp_accounts_email_lowercase CHECK (email = lower(trim(email)))
);

CREATE INDEX IF NOT EXISTS smtp_accounts_email_idx ON public.smtp_accounts (email);

COMMENT ON TABLE public.smtp_accounts IS
  'Credenciales SMTP por dirección From. Solo service role lee smtp_password.';
COMMENT ON COLUMN public.smtp_accounts.smtp_host IS
  'Si es NULL, send-email usa SMTP_HOST del entorno.';
COMMENT ON COLUMN public.smtp_accounts.smtp_password IS
  'Secreto; no SELECT para authenticated. Vacío = aún no configurada.';

ALTER TABLE public.smtp_accounts ENABLE ROW LEVEL SECURITY;

-- Sin acceso amplio: solo columnas no secretas vía políticas + column grants.
REVOKE ALL ON TABLE public.smtp_accounts FROM PUBLIC, anon, authenticated;

GRANT SELECT (
  id, email, smtp_host, smtp_user, label, updated_at, updated_by
) ON public.smtp_accounts TO authenticated;

GRANT INSERT (
  email, smtp_host, smtp_user, smtp_password, label, updated_at, updated_by
) ON public.smtp_accounts TO authenticated;

GRANT UPDATE (
  email, smtp_host, smtp_user, smtp_password, label, updated_at, updated_by
) ON public.smtp_accounts TO authenticated;

-- Admin ve metadatos de todas; el dueño (profile.email = account.email) ve la suya.
CREATE POLICY smtp_accounts_select ON public.smtp_accounts
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR lower(trim(email)) = (
      SELECT lower(trim(p.email))
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY smtp_accounts_insert ON public.smtp_accounts
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR lower(trim(email)) = (
      SELECT lower(trim(p.email))
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY smtp_accounts_update ON public.smtp_accounts
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR lower(trim(email)) = (
      SELECT lower(trim(p.email))
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR lower(trim(email)) = (
      SELECT lower(trim(p.email))
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

-- Solo Admin puede borrar filas.
CREATE POLICY smtp_accounts_delete ON public.smtp_accounts
  FOR DELETE TO authenticated
  USING (public.is_admin());

GRANT DELETE ON public.smtp_accounts TO authenticated;

-- Semilla: fila Niceto sin contraseña hasta que la rellene en LabFlow.
INSERT INTO public.smtp_accounts (email, smtp_user, smtp_password, label)
VALUES ('niceto@go.ugr.es', 'niceto@go.ugr.es', '', 'Niceto (Farmacia)')
ON CONFLICT (email) DO NOTHING;
