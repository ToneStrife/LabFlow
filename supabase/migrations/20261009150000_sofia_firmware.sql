-- Sofía: actualizar el programa de las placas desde LabFlow
-- =================================================================
-- 1) Quien tenga el permiso "Publicar firmware de Sofía" sube el .bin desde
--    Mis Sofías. Se guarda en un almacenamiento PRIVADO (el .bin lleva dentro
--    lo que haya en secrets.h, así que nunca es público).
-- 2) Cada versión se identifica por el MD5 del archivo, que es el mismo que la
--    placa calcula de su propio programa: así se sabe qué versión lleva cada una.
-- 3) Cada placa tiene un modo: "auto" (la última versión publicada), "fija"
--    (una versión concreta, por ejemplo para probar en una sola placa antes
--    de publicarla) o "no" (no se actualiza sola).
-- 4) sofia_config le dice a la placa qué versión le toca. La placa la pide a la
--    función sofia-ota, que comprueba su token y le da un enlace de pocos minutos.
--
-- Se puede ejecutar más de una vez.

-- ------------------------------------------------------------------
-- Permiso
-- ------------------------------------------------------------------
INSERT INTO public.permissions (key, label, description, category, sort_order) VALUES
  ('sofia.firmware', 'Publicar firmware de Sofía', 'Subir versiones nuevas del programa de las placas y publicarlas', 'Sofía', 220)
ON CONFLICT (key) DO UPDATE
  SET label = EXCLUDED.label, description = EXCLUDED.description,
      category = EXCLUDED.category, sort_order = EXCLUDED.sort_order;

INSERT INTO public.role_permissions (role, permission_key, allowed) VALUES
  ('Admin', 'sofia.firmware', false),
  ('Account Manager', 'sofia.firmware', false),
  ('Requester', 'sofia.firmware', false)
ON CONFLICT (role, permission_key) DO NOTHING;

-- ------------------------------------------------------------------
-- Versiones
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sofia_firmware (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  version     text NOT NULL CHECK (length(trim(version)) BETWEEN 1 AND 40),
  notas       text,
  path        text NOT NULL UNIQUE,                 -- ruta dentro del almacenamiento sofia-firmware
  size        integer NOT NULL CHECK (size > 100000 AND size <= 4194304),
  md5         text NOT NULL UNIQUE CHECK (md5 ~ '^[0-9a-f]{32}$'),
  publicado   boolean NOT NULL DEFAULT false,
  publicado_at timestamptz
);

ALTER TABLE public.sofia_firmware ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sofia_firmware_select ON public.sofia_firmware;
CREATE POLICY sofia_firmware_select ON public.sofia_firmware
  FOR SELECT TO authenticated
  USING (public.has_permission('sofia.use') OR public.has_permission('sofia.firmware'));

DROP POLICY IF EXISTS sofia_firmware_insert ON public.sofia_firmware;
CREATE POLICY sofia_firmware_insert ON public.sofia_firmware
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('sofia.firmware'));

DROP POLICY IF EXISTS sofia_firmware_update ON public.sofia_firmware;
CREATE POLICY sofia_firmware_update ON public.sofia_firmware
  FOR UPDATE TO authenticated
  USING (public.has_permission('sofia.firmware'))
  WITH CHECK (public.has_permission('sofia.firmware'));

DROP POLICY IF EXISTS sofia_firmware_delete ON public.sofia_firmware;
CREATE POLICY sofia_firmware_delete ON public.sofia_firmware
  FOR DELETE TO authenticated
  USING (public.has_permission('sofia.firmware'));

REVOKE ALL ON public.sofia_firmware FROM anon;
GRANT SELECT, INSERT, DELETE ON public.sofia_firmware TO authenticated;
GRANT UPDATE (version, notas, publicado) ON public.sofia_firmware TO authenticated;

CREATE OR REPLACE FUNCTION public.sofia_firmware_publicado_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.publicado AND (TG_OP = 'INSERT' OR NOT OLD.publicado) THEN NEW.publicado_at := now(); END IF;
  IF NOT NEW.publicado THEN NEW.publicado_at := NULL; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sofia_firmware_publicado_at ON public.sofia_firmware;
CREATE TRIGGER sofia_firmware_publicado_at
  BEFORE INSERT OR UPDATE ON public.sofia_firmware
  FOR EACH ROW EXECUTE FUNCTION public.sofia_firmware_publicado_at();

-- ------------------------------------------------------------------
-- Almacenamiento privado para los .bin
-- ------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('sofia-firmware', 'sofia-firmware', false, 4194304)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 4194304;

DROP POLICY IF EXISTS sofia_firmware_objects_select ON storage.objects;
CREATE POLICY sofia_firmware_objects_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'sofia-firmware' AND public.has_permission('sofia.firmware'));

DROP POLICY IF EXISTS sofia_firmware_objects_insert ON storage.objects;
CREATE POLICY sofia_firmware_objects_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sofia-firmware' AND public.has_permission('sofia.firmware'));

DROP POLICY IF EXISTS sofia_firmware_objects_delete ON storage.objects;
CREATE POLICY sofia_firmware_objects_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'sofia-firmware' AND public.has_permission('sofia.firmware'));

-- ------------------------------------------------------------------
-- Qué versión toca a cada placa
-- ------------------------------------------------------------------
ALTER TABLE public.sofia_devices
  ADD COLUMN IF NOT EXISTS ota_modo text NOT NULL DEFAULT 'auto' CHECK (ota_modo IN ('auto', 'fija', 'no')),
  ADD COLUMN IF NOT EXISTS ota_firmware uuid REFERENCES public.sofia_firmware(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS firmware_md5 text;

GRANT UPDATE (ota_modo, ota_firmware) ON public.sofia_devices TO authenticated;

-- La versión que debería llevar la placa (o nada)
CREATE OR REPLACE FUNCTION public.sofia_firmware_destino(d public.sofia_devices)
RETURNS public.sofia_firmware
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.*
    FROM public.sofia_firmware f
   WHERE (d.ota_modo = 'fija' AND f.id = d.ota_firmware)
      OR (d.ota_modo = 'auto' AND f.publicado
          AND f.publicado_at = (SELECT max(publicado_at) FROM public.sofia_firmware WHERE publicado))
   ORDER BY f.publicado_at DESC NULLS LAST
   LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.sofia_firmware_destino(public.sofia_devices) FROM PUBLIC, anon, authenticated;

-- Para la función sofia-ota (solo con la clave de servicio): comprueba el token y dice qué archivo bajar
CREATE OR REPLACE FUNCTION public.sofia_ota_destino(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.sofia_devices;
  f public.sofia_firmware;
BEGIN
  d := public.sofia_device_by_token(p_token);
  f := public.sofia_firmware_destino(d);
  IF f.id IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('id', f.id, 'version', f.version, 'md5', f.md5, 'size', f.size, 'path', f.path);
END;
$$;
REVOKE ALL ON FUNCTION public.sofia_ota_destino(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sofia_ota_destino(text) TO service_role;

-- sofia_config: además del resto, la versión que le toca (si no es la que ya lleva).
-- La placa manda en p_firmware "sofia_v5|<md5 de su programa>".
CREATE OR REPLACE FUNCTION public.sofia_config(p_token text, p_firmware text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d     public.sofia_devices;
  pr    public.profiles;
  s     public.sofia_device_secrets;
  f     public.sofia_firmware;
  v_md5 text;
BEGIN
  d := public.sofia_device_by_token(p_token);
  IF p_firmware IS NOT NULL THEN
    v_md5 := substring(p_firmware FROM '\|([0-9a-f]{32})$');
    UPDATE public.sofia_devices
       SET firmware = left(p_firmware, 80), firmware_md5 = coalesce(v_md5, firmware_md5)
     WHERE id = d.id
     RETURNING * INTO d;
  END IF;
  SELECT * INTO pr FROM public.profiles WHERE id = d.owner_id;
  SELECT * INTO s FROM public.sofia_device_secrets WHERE device_id = d.id;
  f := public.sofia_firmware_destino(d);
  RETURN jsonb_build_object(
    'device_id',    d.id,
    'rev',          d.config_rev,
    'nombre',       d.nombre,
    'propietario',  coalesce(nullif(d.propietario, ''), nullif(pr.first_name, ''), 'sin-nombre'),
    'email',        pr.email,
    'avatar',       d.avatar,
    'voz',          d.voz,
    'volumen',      d.volumen,
    'protocolos',   d.protocolos_carpeta,
    'sede',         d.sede_id,
    'wake_umbral',  d.wake_umbral,
    'voz_minima',   d.voz_minima,
    'fin_frase_ms', d.fin_frase_ms,
    'seguir_ms',    d.seguir_ms,
    'cierre_hora',  d.cierre_hora,
    'silencio_min', d.silencio_min,
    'gemini_key',   coalesce(s.gemini_key, ''),
    'wifi',         coalesce(s.wifi, '[]'::jsonb),
    'ota',          CASE WHEN f.id IS NOT NULL AND f.md5 IS DISTINCT FROM d.firmware_md5
                         THEN jsonb_build_object('version', f.version, 'md5', f.md5, 'size', f.size) END
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.sofia_config(text, text) TO anon, authenticated;
