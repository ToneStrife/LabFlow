-- El propietario de la instalacion
-- =================================================================
-- Hasta ahora "Admin" era el escalon mas alto, asi que un administrador podia
-- degradar o borrar a otro, incluido quien monto todo esto. Con mas gente
-- entrando, hace falta alguien que reparta permisos de administrador sin que
-- nadie pueda quitarle los suyos.
--
-- El propietario:
--   * tiene todos los permisos, pase lo que pase con la matriz
--   * nadie mas puede cambiarle el rol ni borrarle la cuenta
--   * solo otro propietario puede repartir o retirar esa marca
--
-- IMPORTANTE: el UPDATE de mas abajo marca la cuenta de Carlos. Si el
-- propietario tiene que ser otra direccion, cambiala antes de aplicar esto.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_owner boolean NOT NULL DEFAULT false;

UPDATE public.profiles SET is_owner = true WHERE email = 'cjaranda@go.ugr.es';

-- ------------------------------------------------------------------
-- Funciones
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
    WHERE id = auth.uid() AND is_owner
  );
$$;

GRANT EXECUTE ON FUNCTION public.am_i_owner() TO authenticated;

-- El propietario lo puede todo. Se comprueba antes que nada, para que no
-- dependa de lo que diga la matriz.
CREATE OR REPLACE FUNCTION public.has_permission(p_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.am_i_owner() THEN true
    WHEN p_key IN ('permissions.manage', 'users.manage') AND public.is_admin() THEN true
    ELSE COALESCE(
      (SELECT up.allowed
         FROM public.user_permissions up
        WHERE up.user_id = auth.uid()
          AND up.permission_key = p_key),
      (SELECT rp.allowed
         FROM public.role_permissions rp
         JOIN public.profiles pr ON pr.role::text = rp.role
        WHERE pr.id = auth.uid()
          AND rp.permission_key = p_key),
      false
    )
  END;
$$;

-- ------------------------------------------------------------------
-- Protecciones
--
-- Van en triggers y no en politicas RLS a proposito: las Edge Functions usan
-- la clave de servicio, que se salta las politicas. Un trigger se cumple
-- igual, asi que la funcion delete-user tampoco puede borrar al propietario.
--
-- La via de escape es el SQL Editor del panel, que se conecta como postgres:
-- desde ahi siempre se puede reasignar el propietario a mano.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_owner_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF (NEW.is_owner IS DISTINCT FROM OLD.is_owner) AND NOT public.am_i_owner() THEN
    RAISE EXCEPTION 'Solo el propietario puede repartir o retirar esa marca';
  END IF;

  IF OLD.is_owner
     AND (NEW.role IS DISTINCT FROM OLD.role)
     AND (auth.uid() IS NULL OR auth.uid() <> OLD.id) THEN
    RAISE EXCEPTION 'No se puede cambiar el rol del propietario';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_owner_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin') THEN
    RETURN OLD;
  END IF;

  IF OLD.is_owner AND (auth.uid() IS NULL OR auth.uid() <> OLD.id) THEN
    RAISE EXCEPTION 'No se puede borrar la cuenta del propietario';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_owner_update ON public.profiles;
CREATE TRIGGER trg_protect_owner_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_owner_on_update();

DROP TRIGGER IF EXISTS trg_protect_owner_delete ON public.profiles;
CREATE TRIGGER trg_protect_owner_delete
  BEFORE DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_owner_on_delete();

-- Saber si una fila concreta es la del propietario, para las politicas.
CREATE OR REPLACE FUNCTION public.is_owner_row(p_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_id AND is_owner);
$$;

GRANT EXECUTE ON FUNCTION public.is_owner_row(uuid) TO authenticated;

-- Tampoco se le ponen excepciones de permisos al propietario desde fuera.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies
             WHERE schemaname='public' AND tablename='user_permissions'
               AND policyname='user_permissions_write') THEN
    DROP POLICY user_permissions_write ON public.user_permissions;
  END IF;

  CREATE POLICY user_permissions_write ON public.user_permissions
    FOR ALL TO authenticated
    USING (
      public.has_permission('permissions.manage')
      AND (NOT public.is_owner_row(user_id) OR auth.uid() = user_id)
    )
    WITH CHECK (
      public.has_permission('permissions.manage')
      AND (NOT public.is_owner_row(user_id) OR auth.uid() = user_id)
    );
END $$;
