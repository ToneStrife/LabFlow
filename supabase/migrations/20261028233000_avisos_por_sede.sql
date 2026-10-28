-- Aviso al entrar una solicitud: push y correo, por persona y por sede.
-- correo: none | instant | daily (resumen a las 18:00).

CREATE TABLE IF NOT EXISTS public.sede_alertas (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sede_id text NOT NULL REFERENCES public.sedes(id) ON DELETE CASCADE,
  push boolean NOT NULL DEFAULT false,
  correo text NOT NULL DEFAULT 'none' CHECK (correo IN ('none', 'instant', 'daily')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, sede_id)
);

CREATE TABLE IF NOT EXISTS public.avisos_pendientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  sede_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, request_id)
);

ALTER TABLE public.sede_alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos_pendientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sede_alertas_own_select ON public.sede_alertas;
CREATE POLICY sede_alertas_own_select ON public.sede_alertas
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS sede_alertas_own_insert ON public.sede_alertas;
CREATE POLICY sede_alertas_own_insert ON public.sede_alertas
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS sede_alertas_own_update ON public.sede_alertas;
CREATE POLICY sede_alertas_own_update ON public.sede_alertas
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS sede_alertas_own_delete ON public.sede_alertas;
CREATE POLICY sede_alertas_own_delete ON public.sede_alertas
  FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS avisos_pendientes_own_select ON public.avisos_pendientes;
CREATE POLICY avisos_pendientes_own_select ON public.avisos_pendientes
  FOR SELECT TO authenticated USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sede_alertas TO authenticated;
GRANT SELECT ON public.avisos_pendientes TO authenticated;

CREATE OR REPLACE FUNCTION public.destinatarios_aviso_solicitud(p_sede_id text)
RETURNS TABLE (user_id uuid, email text, push boolean, correo text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.email, a.push, a.correo
  FROM public.sede_alertas a
  JOIN public.profiles p ON p.id = a.user_id
  WHERE a.sede_id = p_sede_id
    AND (a.push OR a.correo IN ('instant', 'daily'));
$$;

CREATE OR REPLACE FUNCTION public.encolar_aviso_diario(
  p_user_id uuid,
  p_request_id uuid,
  p_sede_id text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.avisos_pendientes (user_id, request_id, sede_id)
  VALUES (p_user_id, p_request_id, p_sede_id)
  ON CONFLICT (user_id, request_id) DO NOTHING;
$$;

GRANT EXECUTE ON FUNCTION public.destinatarios_aviso_solicitud(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.encolar_aviso_diario(uuid, uuid, text) TO authenticated;

-- Carlos: un correo al día, sin push. Niceto: al momento y con push.
INSERT INTO public.sede_alertas (user_id, sede_id, push, correo)
SELECT p.id, s.id, false, 'daily'
FROM public.profiles p
CROSS JOIN public.sedes s
WHERE lower(p.email) = 'cjaranda@go.ugr.es'
  AND s.id IN ('cibm', 'farmacia')
ON CONFLICT (user_id, sede_id) DO UPDATE
  SET push = EXCLUDED.push, correo = EXCLUDED.correo, updated_at = now();

INSERT INTO public.sede_alertas (user_id, sede_id, push, correo)
SELECT p.id, s.id, true, 'instant'
FROM public.profiles p
CROSS JOIN public.sedes s
WHERE lower(p.email) IN ('niceto@ugr.es', 'niceto@go.ugr.es')
  AND s.id IN ('cibm', 'farmacia')
ON CONFLICT (user_id, sede_id) DO UPDATE
  SET push = EXCLUDED.push, correo = EXCLUDED.correo, updated_at = now();
