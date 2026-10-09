-- Sofía: más ajustes desde LabFlow
-- =================================================================
-- 1) Escucha y horarios: columnas nuevas en sofia_devices. NULL = lo que
--    traiga la placa de fábrica (secrets.h o sus valores por defecto).
-- 2) Claves (clave de Gemini propia y redes WiFi extra): en una tabla
--    aparte que la web NO puede leer. Desde LabFlow solo se pueden poner,
--    cambiar o borrar; la página solo sabe si hay clave y los nombres de red.
--    La placa las recibe con su token en sofia_config.
-- 3) Estado: cada cambio de opciones sube config_rev; la placa responde con
--    la versión que ha aplicado y los avisos que haya (por ejemplo, que la
--    carpeta de protocolos no existe), y la página lo enseña.
--
-- Se puede ejecutar más de una vez.

ALTER TABLE public.sofia_devices
  ADD COLUMN IF NOT EXISTS wake_umbral   real     CHECK (wake_umbral IS NULL OR wake_umbral BETWEEN 0.2 AND 0.95),
  ADD COLUMN IF NOT EXISTS voz_minima    integer  CHECK (voz_minima IS NULL OR voz_minima BETWEEN 200 AND 3000),
  ADD COLUMN IF NOT EXISTS fin_frase_ms  integer  CHECK (fin_frase_ms IS NULL OR fin_frase_ms BETWEEN 600 AND 4000),
  ADD COLUMN IF NOT EXISTS seguir_ms     integer  CHECK (seguir_ms IS NULL OR seguir_ms BETWEEN 0 AND 20000),
  ADD COLUMN IF NOT EXISTS cierre_hora   smallint CHECK (cierre_hora IS NULL OR cierre_hora BETWEEN 0 AND 24),
  ADD COLUMN IF NOT EXISTS silencio_min  smallint CHECK (silencio_min IS NULL OR silencio_min BETWEEN 0 AND 180),
  ADD COLUMN IF NOT EXISTS config_rev    integer  NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS applied_rev   integer,
  ADD COLUMN IF NOT EXISTS estado        jsonb    NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.sofia_devices.wake_umbral  IS 'Umbral de la palabra Sophia (más bajo = más sensible). NULL = el de la placa';
COMMENT ON COLUMN public.sofia_devices.voz_minima   IS 'Nivel mínimo de voz para contar que hablas (sube si el ruido la dispara). NULL = el de la placa';
COMMENT ON COLUMN public.sofia_devices.fin_frase_ms IS 'Silencio que da por terminada una frase. NULL = el de la placa';
COMMENT ON COLUMN public.sofia_devices.seguir_ms    IS 'Tras contestar, tiempo para seguir hablando sin decir Sophia (0 = no). NULL = el de la placa';
COMMENT ON COLUMN public.sofia_devices.cierre_hora  IS 'Hora del cierre del día automático (24 = nunca). NULL = el de la placa';
COMMENT ON COLUMN public.sofia_devices.silencio_min IS 'Minutos del modo silencio antes de volver a escuchar (0 = hasta quitarlo). NULL = el de la placa';
COMMENT ON COLUMN public.sofia_devices.estado       IS 'Lo que cuenta la placa al aplicar la configuración (avisos, cuándo)';

GRANT UPDATE (wake_umbral, voz_minima, fin_frase_ms, seguir_ms, cierre_hora, silencio_min)
  ON public.sofia_devices TO authenticated;

-- Cada cambio de opciones es una versión nueva
CREATE OR REPLACE FUNCTION public.sofia_devices_bump_rev()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (to_jsonb(NEW) - ARRAY['config_rev', 'applied_rev', 'estado', 'last_seen_at', 'firmware'])
     IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['config_rev', 'applied_rev', 'estado', 'last_seen_at', 'firmware']) THEN
    NEW.config_rev := OLD.config_rev + 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sofia_devices_bump_rev ON public.sofia_devices;
CREATE TRIGGER sofia_devices_bump_rev
  BEFORE UPDATE ON public.sofia_devices
  FOR EACH ROW EXECUTE FUNCTION public.sofia_devices_bump_rev();

-- ------------------------------------------------------------------
-- Claves (no se leen desde la web)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sofia_device_secrets (
  device_id  uuid PRIMARY KEY REFERENCES public.sofia_devices(id) ON DELETE CASCADE,
  gemini_key text,
  wifi       jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{"ssid": "...", "pass": "..."}], como mucho 3
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sofia_device_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sofia_device_secrets FROM anon, authenticated;
-- sin políticas: solo las funciones de abajo la tocan

-- Lo que la página puede saber: si hay clave y qué redes (sin contraseñas)
CREATE OR REPLACE FUNCTION public.sofia_secret_info(p_device uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.sofia_device_secrets;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.sofia_devices WHERE id = p_device AND owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'Esa Sofia no es tuya';
  END IF;
  SELECT * INTO s FROM public.sofia_device_secrets WHERE device_id = p_device;
  RETURN jsonb_build_object(
    'gemini', coalesce(s.gemini_key, '') <> '',
    'gemini_fin', CASE WHEN length(coalesce(s.gemini_key, '')) >= 8 THEN right(s.gemini_key, 4) END,
    'wifi', coalesce((SELECT jsonb_agg(w->>'ssid') FROM jsonb_array_elements(coalesce(s.wifi, '[]'::jsonb)) w), '[]'::jsonb)
  );
END;
$$;

-- Poner o quitar la clave de Gemini (p_gemini = '' la borra; NULL no la toca)
-- y las redes extra (p_wifi = lista completa [{ssid, pass}]; una red sin pass
-- conserva la contraseña que ya tuviera; NULL no las toca).
CREATE OR REPLACE FUNCTION public.sofia_set_secrets(p_device uuid, p_gemini text DEFAULT NULL, p_wifi jsonb DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s      public.sofia_device_secrets;
  v_wifi jsonb := '[]'::jsonb;
  w      jsonb;
  v_ssid text;
  v_pass text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.sofia_devices WHERE id = p_device AND owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'Esa Sofia no es tuya';
  END IF;
  INSERT INTO public.sofia_device_secrets (device_id) VALUES (p_device) ON CONFLICT (device_id) DO NOTHING;
  SELECT * INTO s FROM public.sofia_device_secrets WHERE device_id = p_device;

  IF p_gemini IS NOT NULL THEN
    p_gemini := trim(p_gemini);
    IF p_gemini <> '' AND (length(p_gemini) < 20 OR p_gemini ~ '\s') THEN
      RAISE EXCEPTION 'Esa clave de Gemini no parece valida';
    END IF;
    s.gemini_key := nullif(p_gemini, '');
  END IF;

  IF p_wifi IS NOT NULL THEN
    IF jsonb_typeof(p_wifi) <> 'array' OR jsonb_array_length(p_wifi) > 3 THEN
      RAISE EXCEPTION 'Como mucho 3 redes extra';
    END IF;
    FOR w IN SELECT * FROM jsonb_array_elements(p_wifi) LOOP
      v_ssid := trim(coalesce(w->>'ssid', ''));
      CONTINUE WHEN v_ssid = '';
      IF length(v_ssid) > 32 THEN RAISE EXCEPTION 'El nombre de red % es demasiado largo', v_ssid; END IF;
      v_pass := w->>'pass';
      IF v_pass IS NULL THEN   -- sin contraseña nueva: se queda la que tuviera
        SELECT o->>'pass' INTO v_pass FROM jsonb_array_elements(coalesce(s.wifi, '[]'::jsonb)) o WHERE o->>'ssid' = v_ssid LIMIT 1;
      END IF;
      IF coalesce(length(v_pass), 0) > 63 THEN RAISE EXCEPTION 'La contrasena de % es demasiado larga', v_ssid; END IF;
      v_wifi := v_wifi || jsonb_build_array(jsonb_build_object('ssid', v_ssid, 'pass', coalesce(v_pass, '')));
    END LOOP;
    s.wifi := v_wifi;
  END IF;

  UPDATE public.sofia_device_secrets SET gemini_key = s.gemini_key, wifi = s.wifi, updated_at = now() WHERE device_id = p_device;
  UPDATE public.sofia_devices SET config_rev = config_rev + 1 WHERE id = p_device;
  RETURN public.sofia_secret_info(p_device);
END;
$$;

-- ------------------------------------------------------------------
-- Lo que lee la placa (sustituye a la de la primera migración)
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sofia_config(p_token text, p_firmware text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d  public.sofia_devices;
  pr public.profiles;
  s  public.sofia_device_secrets;
BEGIN
  d := public.sofia_device_by_token(p_token);
  IF p_firmware IS NOT NULL THEN
    UPDATE public.sofia_devices SET firmware = left(p_firmware, 40) WHERE id = d.id;
  END IF;
  SELECT * INTO pr FROM public.profiles WHERE id = d.owner_id;
  SELECT * INTO s FROM public.sofia_device_secrets WHERE device_id = d.id;
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
    'wifi',         coalesce(s.wifi, '[]'::jsonb)
  );
END;
$$;

-- La placa cuenta qué versión ha aplicado y si algo no ha ido bien
CREATE OR REPLACE FUNCTION public.sofia_report(p_token text, p_rev integer, p_estado jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.sofia_devices;
BEGIN
  d := public.sofia_device_by_token(p_token);
  UPDATE public.sofia_devices
     SET applied_rev = p_rev,
         estado = coalesce(p_estado, '{}'::jsonb) || jsonb_build_object('aplicado_at', now())
   WHERE id = d.id;
END;
$$;

REVOKE ALL ON FUNCTION public.sofia_secret_info(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sofia_set_secrets(uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sofia_report(text, integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sofia_secret_info(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sofia_set_secrets(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sofia_report(text, integer, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sofia_config(text, text) TO anon, authenticated;

-- =================================================================
-- Búsqueda de productos más tolerante
-- =================================================================
-- La primera versión exigía que estuvieran todas las palabras tal cual. Ahora:
--   * minúsculas y sin tildes; "5 ml", "5ml" y "5 mL" son lo mismo;
--   * singular y plural ("pipetas" = "pipeta", "tubes" = "tube");
--   * español e inglés para el material habitual ("pipeta" = "pipette");
--   * faltas pequeñas (trigramas) y palabras que empiezan igual;
--   * Sofía puede mandar varias formas del nombre separadas por "|"
--     (por ejemplo "pipetas serologicas 5 ml|serological pipette 5 mL")
--     y vale la que mejor encaje;
--   * basta con que coincida la mayoría de las palabras, y se ordenan por
--     parecido y luego por fecha.

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Palabras de un texto, ya normalizadas
CREATE OR REPLACE FUNCTION public.sofia_tokens(p text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  t   text := public.sofia_norm(p);
  w   text;
  out text[] := '{}';
BEGIN
  t := replace(t, 'µ', 'u');
  -- unidades dichas en palabras
  t := regexp_replace(t, '\m(microlitros?|microlitres?|microliters?)\M', 'ul', 'g');
  t := regexp_replace(t, '\m(mililitros?|millilitres?|milliliters?)\M', 'ml', 'g');
  t := regexp_replace(t, '\m(microgramos?|micrograms?)\M', 'ug', 'g');
  t := regexp_replace(t, '\m(miligramos?|milligrams?)\M', 'mg', 'g');
  t := regexp_replace(t, '\m(nanogramos?|nanograms?)\M', 'ng', 'g');
  t := regexp_replace(t, '\m(micras?|micrometros?|microns?|micrometers?)\M', 'um', 'g');
  t := regexp_replace(t, '\m(litros?|litres?|liters?)\M', 'l', 'g');
  -- número + unidad juntos: "5 ml" -> "5ml", "0,22 um" -> "0.22um"
  t := regexp_replace(t, '(\d)[,](\d)', '\1.\2', 'g');
  t := regexp_replace(t, '(\d)\s*(ml|ul|l|mg|ug|ng|g|kg|mm|um|nm|cm|m|kda|x|mm2|cm2|%)(?![a-z])', '\1\2', 'g');
  FOREACH w IN ARRAY regexp_split_to_array(t, '[^a-z0-9.%]+') LOOP
    w := trim(both '.' from w);
    CONTINUE WHEN w = '' OR length(w) < 2 AND w !~ '^\d';
    CONTINUE WHEN w = ANY (ARRAY['de','del','la','el','los','las','para','con','y','a','en','un','una','unos','unas','por',
                                 'of','the','for','with','and','to','in','pack','caja','cajas','box','unidad','unidades','ud','uds','pcs','pk']);
    -- plural sencillo (no a los códigos ni a las unidades)
    IF w !~ '\d' AND length(w) > 3 AND right(w, 1) = 's' THEN w := left(w, length(w) - 1); END IF;
    out := out || w;
  END LOOP;
  RETURN out;
END;
$$;

-- Equivalencias español / inglés del material más habitual (todo sin tildes y en singular)
CREATE OR REPLACE FUNCTION public.sofia_sinonimos(w text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ARRAY[w] || coalesce((
    SELECT array_agg(x) FROM (VALUES
      ('pipeta','pipette'), ('pipette','pipeta'), ('serologica','serological'), ('serological','serologica'),
      ('punta','tip'), ('tip','punta'), ('puntas','tip'), ('tubo','tube'), ('tube','tubo'), ('falcon','tube'),
      ('frasco','flask'), ('flask','frasco'), ('matraz','flask'), ('placa','plate'), ('plate','placa'),
      ('pocillo','well'), ('well','pocillo'), ('suero','serum'), ('serum','suero'), ('fetal','fetal'),
      ('bovino','bovine'), ('bovine','bovino'), ('guante','glove'), ('glove','guante'), ('jeringa','syringe'),
      ('syringe','jeringa'), ('filtro','filter'), ('filter','filtro'), ('aguja','needle'), ('needle','aguja'),
      ('medio','medium'), ('medium','medio'), ('anticuerpo','antibody'), ('antibody','anticuerpo'),
      ('esteril','sterile'), ('sterile','esteril'), ('criovial','cryovial'), ('cryovial','criovial'),
      ('vial','vial'), ('cubeta','cuvette'), ('cuvette','cubeta'), ('portaobjeto','slide'), ('slide','portaobjeto'),
      ('cubreobjeto','coverslip'), ('coverslip','cubreobjeto'), ('tripsina','trypsin'), ('trypsin','tripsina'),
      ('penicilina','penicillin'), ('penicillin','penicilina'), ('estreptomicina','streptomycin'),
      ('streptomycin','estreptomicina'), ('tampon','buffer'), ('buffer','tampon'), ('etanol','ethanol'),
      ('ethanol','etanol'), ('alcohol','ethanol'), ('gradilla','rack'), ('rack','gradilla'), ('papel','paper'),
      ('bolsa','bag'), ('bag','bolsa'), ('cultivo','culture'), ('culture','cultivo'), ('celula','cell'), ('cell','celula')
    ) AS v(a, x) WHERE v.a = w), '{}');
$$;

-- Parecido entre lo que se pide (una forma del nombre) y una línea de pedido: de 0 a 1
CREATE OR REPLACE FUNCTION public.sofia_parecido(p_q text[], p_hay text[])
RETURNS real
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, extensions
AS $$
DECLARE
  t     text;
  n     int := 0;
  ok    int := 0;
  okTxt int := 0;
  hit   boolean;
BEGIN
  IF p_q IS NULL OR array_length(p_q, 1) IS NULL THEN RETURN 0; END IF;
  FOREACH t IN ARRAY p_q LOOP
    n := n + 1;
    IF t ~ '\d' THEN   -- números y medidas: tal cual (5ml no es 50ml)
      hit := t = ANY (p_hay)
          OR (t ~ '^\d+(\.\d+)?$' AND EXISTS (SELECT 1 FROM unnest(p_hay) h WHERE h ~ ('^' || replace(t, '.', '\.') || '[a-z%]+$')));
    ELSE
      SELECT EXISTS (
        SELECT 1 FROM unnest(public.sofia_sinonimos(t)) s, unnest(p_hay) h
         WHERE h = s
            OR (length(s) >= 4 AND length(h) >= 4 AND (h LIKE s || '%' OR s LIKE h || '%'))
            OR (length(s) >= 5 AND h !~ '\d' AND similarity(s, h) >= 0.45)
      ) INTO hit;
      IF hit THEN okTxt := okTxt + 1; END IF;
    END IF;
    IF hit THEN ok := ok + 1; END IF;
  END LOOP;
  IF okTxt = 0 THEN RETURN 0; END IF;   -- solo con números no vale
  RETURN ok::real / n;
END;
$$;

-- Rasgos que distinguen material parecido (filtro, estéril, color...), sacados del nombre y la descripción
CREATE OR REPLACE FUNCTION public.sofia_rasgos(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT nullif(concat_ws(', ',
    CASE WHEN t ~ '(no|non|sin|without)[ -]?(filter|filtro|filtered)|unfiltered' THEN 'sin filtro'
         WHEN t ~ 'filter|filtro|barrera|barrier|aerosol' THEN 'con filtro' END,
    CASE WHEN t ~ '(no|non)[ -]?(esteril|sterile)|nonsterile' THEN 'no estéril'
         WHEN t ~ 'esteril|sterile|steril' THEN 'estéril' END,
    CASE WHEN t ~ 'low[ -]?(retention|binding)|baja retencion' THEN 'baja retención' END,
    CASE WHEN t ~ 'amarill|yellow' THEN 'amarillas' WHEN t ~ 'azul|blue' THEN 'azules'
         WHEN t ~ 'transparent|clear|natural|incolor' THEN 'transparentes' END,
    CASE WHEN t ~ 'graduad|graduated' THEN 'graduadas' END,
    CASE WHEN t ~ 'rack|gradilla|caja con|boxed' THEN 'en caja/rack'
         WHEN t ~ 'bag|bolsa|bulk|granel' THEN 'en bolsa' END
  ), '')
  FROM (SELECT public.sofia_norm(p) AS t) x;
$$;

CREATE OR REPLACE FUNCTION public.sofia_buscar_producto(p_token text, p_texto text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  d       public.sofia_devices;
  v_prev  jsonb;
  v_vend  jsonb;
  v_proj  jsonb;
  v_words text[];
BEGIN
  d := public.sofia_device_by_token(p_token);
  IF coalesce(trim(p_texto), '') = '' THEN RETURN jsonb_build_object('anteriores', '[]'::jsonb); END IF;

  WITH formas AS (
    SELECT public.sofia_tokens(f) AS q FROM unnest(string_to_array(p_texto, '|')) f WHERE trim(f) <> ''
  ),
  lineas AS (
    SELECT ri.*, r.created_at AS fecha_pedido, r.vendor_id, r.project_codes,
           public.sofia_tokens(ri.product_name || ' ' || coalesce(ri.catalog_number, '') || ' ' ||
                               coalesce(ri.brand, '') || ' ' || coalesce(ri.format, '')) AS hay
      FROM public.request_items ri
      JOIN public.requests r ON r.id = ri.request_id
  ),
  puntuadas AS (
    SELECT l.*, (SELECT max(public.sofia_parecido(f.q, l.hay)) FROM formas f) AS score
      FROM lineas l
  ),
  unicas AS (   -- un resultado por producto (el pedido más reciente)
    SELECT DISTINCT ON (public.sofia_norm(p.product_name), coalesce(p.catalog_number, '')) p.*
      FROM puntuadas p
     WHERE p.score >= 0.5
     ORDER BY public.sofia_norm(p.product_name), coalesce(p.catalog_number, ''), p.fecha_pedido DESC
  )
  SELECT coalesce(jsonb_agg(x ORDER BY (x->>'parecido')::real DESC, x->>'fecha' DESC), '[]'::jsonb) INTO v_prev
    FROM (
      SELECT jsonb_build_object(
               'ref',        u.id,
               'producto',   u.product_name,
               'referencia', u.catalog_number,
               'marca',      u.brand,
               'formato',    u.format,
               'cantidad',   u.quantity,
               'proveedor',  v.name,
               'fecha',      to_char(u.fecha_pedido, 'YYYY-MM-DD'),
               'parecido',   round(u.score::numeric, 2),
               'notas',      left(nullif(trim(coalesce(u.notes, '')), ''), 140),
               'rasgos',     public.sofia_rasgos(u.product_name || ' ' || coalesce(u.format, '') || ' ' || coalesce(u.notes, '') || ' ' || coalesce(u.brand, '')),
               'proyectos',  (SELECT coalesce(jsonb_agg(pj.code || ' ' || pj.name), '[]'::jsonb)
                                FROM public.projects pj
                               WHERE u.project_codes IS NOT NULL AND pj.id::text = ANY (u.project_codes::text[]))
             ) AS x
        FROM unicas u
        LEFT JOIN public.vendors v ON v.id = u.vendor_id
       ORDER BY u.score DESC, u.fecha_pedido DESC
       LIMIT 3
    ) t;

  v_words := public.sofia_tokens(replace(p_texto, '|', ' '));
  SELECT coalesce(jsonb_agg(v.name), '[]'::jsonb) INTO v_vend
    FROM public.vendors v
   WHERE EXISTS (SELECT 1 FROM unnest(v_words) w WHERE length(w) >= 3 AND public.sofia_norm(v.name) LIKE '%' || w || '%');

  SELECT coalesce(jsonb_agg(pj.code || ' ' || pj.name ORDER BY pj.code), '[]'::jsonb) INTO v_proj
    FROM public.projects pj;

  RETURN jsonb_build_object('anteriores', v_prev, 'proveedores', v_vend, 'proyectos', v_proj);
END;
$$;

-- Últimos pedidos del laboratorio (o de un producto), con su estado
CREATE OR REPLACE FUNCTION public.sofia_ultimos_pedidos(p_token text, p_texto text DEFAULT NULL, p_mios boolean DEFAULT false, p_n integer DEFAULT 5)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  d     public.sofia_devices;
  v_res jsonb;
BEGIN
  d := public.sofia_device_by_token(p_token);
  p_n := least(greatest(coalesce(p_n, 5), 1), 10);
  WITH formas AS (
    SELECT public.sofia_tokens(f) AS q FROM unnest(string_to_array(coalesce(p_texto, ''), '|')) f WHERE trim(f) <> ''
  ),
  cand AS (
    SELECT r.*,
           (SELECT string_agg(ri.quantity || ' x ' || ri.product_name, '; ' ORDER BY ri.product_name)
              FROM public.request_items ri WHERE ri.request_id = r.id) AS lineas,
           CASE WHEN NOT EXISTS (SELECT 1 FROM formas) THEN 1
                ELSE (SELECT max(public.sofia_parecido(f.q, public.sofia_tokens(ri.product_name || ' ' || coalesce(ri.catalog_number, '') || ' ' || coalesce(ri.brand, ''))))
                        FROM public.request_items ri, formas f WHERE ri.request_id = r.id) END AS score
      FROM public.requests r
     WHERE NOT p_mios OR r.requester_id = d.owner_id
  )
  SELECT coalesce(jsonb_agg(x), '[]'::jsonb) INTO v_res FROM (
    SELECT jsonb_build_object(
             'numero',    coalesce(c.request_number, left(c.id::text, 8)),
             'fecha',     to_char(c.created_at, 'YYYY-MM-DD'),
             'estado',    CASE c.status::text
                            WHEN 'Pending' THEN 'pendiente de aprobar'
                            WHEN 'Quote Requested' THEN 'aprobado, pendiente de presupuesto'
                            WHEN 'PO Requested' THEN 'orden de compra pedida'
                            WHEN 'Ordered' THEN 'pedido al proveedor'
                            WHEN 'Received' THEN 'recibido'
                            WHEN 'Denied' THEN 'denegado'
                            WHEN 'Cancelled' THEN 'cancelado'
                            ELSE c.status::text END,
             'proveedor', v.name,
             'quien',     trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')),
             'que',       left(coalesce(c.lineas, ''), 160)
           ) AS x
      FROM cand c
      LEFT JOIN public.vendors v ON v.id = c.vendor_id
      LEFT JOIN public.profiles p ON p.id = c.requester_id
     WHERE c.score >= 0.5
     ORDER BY c.created_at DESC
     LIMIT p_n
  ) t;
  RETURN jsonb_build_object('pedidos', v_res);
END;
$$;

REVOKE ALL ON FUNCTION public.sofia_ultimos_pedidos(text, text, boolean, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sofia_ultimos_pedidos(text, text, boolean, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sofia_buscar_producto(text, text) TO anon, authenticated;
