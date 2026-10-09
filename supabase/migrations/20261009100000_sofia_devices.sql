-- Sofía: asistentes de voz del laboratorio enlazados a LabFlow
-- =================================================================
-- Cada persona registra su propia Sofía desde "Mis dispositivos":
--   1) la placa pide un código de 6 cifras y lo enseña en pantalla
--      (sofia_pair_start), y se queda preguntando si ya está
--      (sofia_pair_poll);
--   2) la persona escribe el código en LabFlow (sofia_pair_claim, con su
--      sesión), y así la placa queda a su nombre;
--   3) la placa recibe una vez su clave propia (token) y la guarda.
--
-- La placa no tiene sesión de usuario: llama a estas funciones con la clave
-- pública de la app más su token. Las funciones comprueban el token y actúan
-- en nombre de la dueña o el dueño del aparato. El token solo se guarda
-- cifrado (sha256), y la tabla de emparejamiento no la lee nadie desde fuera.
--
-- Pedidos por voz: sofia_buscar_producto y sofia_pedir. La solicitud se crea
-- con la misma función que usa la app (create_request_with_items), como si la
-- hubiera hecho la persona, así que pasa por sus permisos y por el registro de
-- actividad igual que una hecha a mano.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ------------------------------------------------------------------
-- Tablas
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sofia_devices (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  owner_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hw_id              text NOT NULL UNIQUE,            -- identificador de la placa (MAC)
  token_hash         text NOT NULL UNIQUE,
  nombre             text NOT NULL DEFAULT 'Sofía',   -- nombre de la asistente
  propietario        text,                            -- cómo la llama a su dueño/a y nombre de su libreta
  avatar             smallint NOT NULL DEFAULT 1 CHECK (avatar BETWEEN 0 AND 3),
  voz                text NOT NULL DEFAULT 'Kore',
  volumen            smallint NOT NULL DEFAULT 70 CHECK (volumen BETWEEN 10 AND 100),
  protocolos_carpeta text NOT NULL DEFAULT 'Protocolos Jarvis',
  sede_id            text,
  last_seen_at       timestamptz,
  firmware           text
);

CREATE INDEX IF NOT EXISTS sofia_devices_owner_idx ON public.sofia_devices (owner_id);

COMMENT ON TABLE public.sofia_devices IS 'Asistentes Sofía registrados, uno por placa, con su dueño y sus opciones';

CREATE TABLE IF NOT EXISTS public.sofia_pairing (
  hw_id       text PRIMARY KEY,
  code        text NOT NULL,
  expires_at  timestamptz NOT NULL,
  token_plain text,      -- solo entre el emparejamiento y la primera consulta de la placa
  device_id   uuid REFERENCES public.sofia_devices(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS sofia_pairing_code_idx ON public.sofia_pairing (code);

ALTER TABLE public.sofia_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sofia_pairing ENABLE ROW LEVEL SECURITY;
-- sofia_pairing: sin políticas a propósito. Solo la tocan las funciones de abajo.

DROP POLICY IF EXISTS sofia_devices_select ON public.sofia_devices;
CREATE POLICY sofia_devices_select ON public.sofia_devices
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS sofia_devices_update ON public.sofia_devices;
CREATE POLICY sofia_devices_update ON public.sofia_devices
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS sofia_devices_delete ON public.sofia_devices;
CREATE POLICY sofia_devices_delete ON public.sofia_devices
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());

-- El alta solo por sofia_pair_claim (no hay política de INSERT).
-- Las columnas que se pueden cambiar desde la app: las opciones, no el dueño ni el token.
REVOKE ALL ON public.sofia_devices FROM anon, authenticated;
REVOKE ALL ON public.sofia_pairing FROM anon, authenticated;
GRANT SELECT, DELETE ON public.sofia_devices TO authenticated;
GRANT UPDATE (nombre, propietario, avatar, voz, volumen, protocolos_carpeta, sede_id)
  ON public.sofia_devices TO authenticated;

-- ------------------------------------------------------------------
-- Permiso para ver "Mis Sofías" y emparejar una placa
-- Nadie lo tiene por su rol: de momento solo el propietario de la app (que lo
-- puede todo). Para dárselo a alguien más: Admin > Permisos, excepción por persona.
-- ------------------------------------------------------------------
INSERT INTO public.permissions (key, label, description, category, sort_order) VALUES
  ('sofia.use', 'Usar Sofía', 'Ver Mis Sofías y emparejar un asistente de voz', 'Sofía', 210)
ON CONFLICT (key) DO UPDATE
  SET label = EXCLUDED.label, description = EXCLUDED.description,
      category = EXCLUDED.category, sort_order = EXCLUDED.sort_order;

INSERT INTO public.role_permissions (role, permission_key, allowed) VALUES
  ('Admin', 'sofia.use', false),
  ('Account Manager', 'sofia.use', false),
  ('Requester', 'sofia.use', false)
ON CONFLICT (role, permission_key) DO NOTHING;

-- ------------------------------------------------------------------
-- Ayudas internas
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sofia_hash(p_token text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT encode(extensions.digest(convert_to(coalesce(p_token, ''), 'UTF8'), 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION public.sofia_device_by_token(p_token text)
RETURNS public.sofia_devices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  d public.sofia_devices;
BEGIN
  IF p_token IS NULL OR length(p_token) < 20 THEN
    RAISE EXCEPTION 'sofia: token no valido' USING ERRCODE = '28000';
  END IF;
  SELECT * INTO d FROM public.sofia_devices WHERE token_hash = public.sofia_hash(p_token);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'sofia: aparato no registrado' USING ERRCODE = '28000';
  END IF;
  UPDATE public.sofia_devices SET last_seen_at = now() WHERE id = d.id;
  RETURN d;
END;
$$;

-- Actuar como la dueña o el dueño del aparato hasta el final de la transacción,
-- para que auth.uid(), los permisos y el registro de actividad la vean a ella.
CREATE OR REPLACE FUNCTION public.sofia_act_as(p_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
                     jsonb_build_object('sub', p_user::text, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', p_user::text, true);
END;
$$;

-- Texto en minúsculas y sin tildes, para comparar lo que se oye con lo guardado
CREATE OR REPLACE FUNCTION public.sofia_norm(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(translate(coalesce(p, ''), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'));
$$;

REVOKE ALL ON FUNCTION public.sofia_device_by_token(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sofia_act_as(uuid) FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------
-- Emparejamiento
-- ------------------------------------------------------------------
-- La placa pide un código (vale 10 minutos)
CREATE OR REPLACE FUNCTION public.sofia_pair_start(p_hw text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_code text;
  i int := 0;
BEGIN
  IF p_hw IS NULL OR length(p_hw) < 6 OR length(p_hw) > 40 THEN
    RAISE EXCEPTION 'sofia: identificador de placa no valido';
  END IF;
  DELETE FROM public.sofia_pairing WHERE expires_at < now() - interval '1 hour';
  LOOP
    v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.sofia_pairing WHERE code = v_code AND expires_at > now());
    i := i + 1;
    IF i > 20 THEN RAISE EXCEPTION 'sofia: no hay codigos libres, prueba en un momento'; END IF;
  END LOOP;
  INSERT INTO public.sofia_pairing (hw_id, code, expires_at, token_plain, device_id)
  VALUES (p_hw, v_code, now() + interval '10 minutes', NULL, NULL)
  ON CONFLICT (hw_id) DO UPDATE
    SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at, token_plain = NULL, device_id = NULL;
  RETURN v_code;
END;
$$;

-- La placa pregunta si alguien ya ha escrito su código. Devuelve el token una sola vez.
CREATE OR REPLACE FUNCTION public.sofia_pair_poll(p_hw text, p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.sofia_pairing;
BEGIN
  SELECT * INTO p FROM public.sofia_pairing WHERE hw_id = p_hw AND code = p_code;
  IF NOT FOUND THEN RETURN jsonb_build_object('estado', 'caducado'); END IF;
  IF p.token_plain IS NOT NULL THEN
    DELETE FROM public.sofia_pairing WHERE hw_id = p_hw;
    RETURN jsonb_build_object('estado', 'listo', 'token', p.token_plain);
  END IF;
  IF p.expires_at < now() THEN RETURN jsonb_build_object('estado', 'caducado'); END IF;
  RETURN jsonb_build_object('estado', 'esperando');
END;
$$;

-- La persona escribe el código en LabFlow. Si la placa ya era de alguien, pasa a ser suya.
CREATE OR REPLACE FUNCTION public.sofia_pair_claim(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  p     public.sofia_pairing;
  me    public.profiles;
  v_tok text;
  v_id  uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Hay que iniciar sesion'; END IF;
  IF NOT public.has_permission('sofia.use') THEN
    RAISE EXCEPTION 'No tienes permiso para usar Sofia. Pideselo a quien administra LabFlow.';
  END IF;
  SELECT * INTO p FROM public.sofia_pairing
   WHERE code = regexp_replace(coalesce(p_code, ''), '\D', '', 'g') AND expires_at > now() AND token_plain IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Codigo no valido o caducado. Pide uno nuevo en la placa.'; END IF;
  SELECT * INTO me FROM public.profiles WHERE id = auth.uid();
  v_tok := encode(extensions.gen_random_bytes(24), 'hex');
  DELETE FROM public.sofia_devices WHERE hw_id = p.hw_id;
  INSERT INTO public.sofia_devices (owner_id, hw_id, token_hash, propietario, sede_id)
  VALUES (auth.uid(), p.hw_id, public.sofia_hash(v_tok), nullif(trim(coalesce(me.first_name, '')), ''), me.default_sede_id)
  RETURNING id INTO v_id;
  UPDATE public.sofia_pairing SET token_plain = v_tok, device_id = v_id WHERE hw_id = p.hw_id;
  RETURN v_id;
END;
$$;

-- ------------------------------------------------------------------
-- Configuración (la placa al arrancar, y el script de la libreta)
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
BEGIN
  d := public.sofia_device_by_token(p_token);
  IF p_firmware IS NOT NULL THEN
    UPDATE public.sofia_devices SET firmware = left(p_firmware, 40) WHERE id = d.id;
  END IF;
  SELECT * INTO pr FROM public.profiles WHERE id = d.owner_id;
  RETURN jsonb_build_object(
    'device_id',   d.id,
    'nombre',      d.nombre,
    'propietario', coalesce(nullif(d.propietario, ''), nullif(pr.first_name, ''), 'sin-nombre'),
    'email',       pr.email,
    'avatar',      d.avatar,
    'voz',         d.voz,
    'volumen',     d.volumen,
    'protocolos',  d.protocolos_carpeta,
    'sede',        d.sede_id
  );
END;
$$;

-- ------------------------------------------------------------------
-- Pedidos por voz
-- ------------------------------------------------------------------
-- Busca lo que se ha pedido antes con ese nombre o referencia (lo más reciente
-- primero) y devuelve también proveedores y proyectos parecidos, para que
-- Sofía pueda proponer "lo mismo que la última vez".
CREATE OR REPLACE FUNCTION public.sofia_buscar_producto(p_token text, p_texto text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d       public.sofia_devices;
  v_words text[];
  v_prev  jsonb;
  v_vend  jsonb;
  v_proj  jsonb;
BEGIN
  d := public.sofia_device_by_token(p_token);
  SELECT array_agg(w) INTO v_words
    FROM regexp_split_to_table(public.sofia_norm(p_texto), '[^a-z0-9]+') AS w
   WHERE length(w) >= 2;
  IF v_words IS NULL THEN RETURN jsonb_build_object('anteriores', '[]'::jsonb); END IF;

  SELECT coalesce(jsonb_agg(x ORDER BY x->>'fecha' DESC), '[]'::jsonb) INTO v_prev FROM (
    SELECT DISTINCT ON (public.sofia_norm(ri.product_name), coalesce(ri.catalog_number, ''))
           jsonb_build_object(
             'ref',        ri.id,
             'producto',   ri.product_name,
             'referencia', ri.catalog_number,
             'marca',      ri.brand,
             'formato',    ri.format,
             'cantidad',   ri.quantity,
             'proveedor',  v.name,
             'fecha',      to_char(r.created_at, 'YYYY-MM-DD'),
             'proyectos',  (SELECT coalesce(jsonb_agg(pj.code || ' ' || pj.name), '[]'::jsonb)
                              FROM public.projects pj
                             WHERE r.project_codes IS NOT NULL AND pj.id::text = ANY (r.project_codes::text[]))
           ) AS x
      FROM public.request_items ri
      JOIN public.requests r ON r.id = ri.request_id
      LEFT JOIN public.vendors v ON v.id = r.vendor_id
     WHERE (SELECT bool_and(public.sofia_norm(ri.product_name || ' ' || coalesce(ri.catalog_number, '') || ' ' || coalesce(ri.brand, '')) LIKE '%' || w || '%')
              FROM unnest(v_words) AS w)
     ORDER BY public.sofia_norm(ri.product_name), coalesce(ri.catalog_number, ''), r.created_at DESC
  ) s
  LIMIT 1;

  -- quedarse con los 3 más recientes
  SELECT coalesce(jsonb_agg(e), '[]'::jsonb) INTO v_prev
    FROM (SELECT e FROM jsonb_array_elements(v_prev) e ORDER BY e->>'fecha' DESC LIMIT 3) t;

  SELECT coalesce(jsonb_agg(v.name), '[]'::jsonb) INTO v_vend
    FROM public.vendors v
   WHERE EXISTS (SELECT 1 FROM unnest(v_words) w WHERE public.sofia_norm(v.name) LIKE '%' || w || '%');

  SELECT coalesce(jsonb_agg(pj.code || ' ' || pj.name ORDER BY pj.code), '[]'::jsonb) INTO v_proj
    FROM public.projects pj;

  RETURN jsonb_build_object('anteriores', v_prev, 'proveedores', v_vend, 'proyectos', v_proj);
END;
$$;

-- Crea la solicitud en nombre de la dueña del aparato.
-- Con p_ref (de sofia_buscar_producto) copia referencia, marca, formato, precio,
-- enlace y proveedor de esa línea. Sin p_ref hace falta p_proveedor.
CREATE OR REPLACE FUNCTION public.sofia_pedir(
  p_token     text,
  p_producto  text,
  p_cantidad  numeric DEFAULT 1,
  p_ref       uuid DEFAULT NULL,
  p_proveedor text DEFAULT NULL,
  p_proyecto  text DEFAULT NULL,
  p_notas     text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d        public.sofia_devices;
  ri       public.request_items;
  v_vendor uuid;
  v_vname  text;
  v_ship   uuid;
  v_bill   uuid;
  v_proj   text[];
  v_pname  text;
  v_items  jsonb;
  v_res    jsonb;
  v_req    jsonb;
  v_notify jsonb;
  v_call   text;
BEGIN
  d := public.sofia_device_by_token(p_token);
  PERFORM public.sofia_act_as(d.owner_id);
  IF NOT public.has_permission('requests.create') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No tienes permiso para crear solicitudes en LabFlow.');
  END IF;
  IF coalesce(p_cantidad, 0) <= 0 THEN p_cantidad := 1; END IF;

  IF p_ref IS NOT NULL THEN
    SELECT * INTO ri FROM public.request_items WHERE id = p_ref;
    IF FOUND THEN
      SELECT r.vendor_id INTO v_vendor FROM public.requests r WHERE r.id = ri.request_id;
    END IF;
  END IF;

  IF v_vendor IS NULL THEN
    IF coalesce(trim(p_proveedor), '') = '' THEN
      RETURN jsonb_build_object('ok', false, 'falta', 'proveedor',
        'error', 'No se ha pedido antes: necesito el proveedor.');
    END IF;
    SELECT v.id INTO v_vendor FROM public.vendors v
     WHERE public.sofia_norm(v.name) = public.sofia_norm(p_proveedor)
        OR public.sofia_norm(v.name) LIKE '%' || public.sofia_norm(p_proveedor) || '%'
     ORDER BY (public.sofia_norm(v.name) = public.sofia_norm(p_proveedor)) DESC, length(v.name)
     LIMIT 1;
    IF v_vendor IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'falta', 'proveedor',
        'error', 'No encuentro el proveedor "' || p_proveedor || '" en LabFlow.');
    END IF;
  END IF;
  SELECT name INTO v_vname FROM public.vendors WHERE id = v_vendor;

  IF coalesce(trim(p_proyecto), '') <> '' THEN
    SELECT ARRAY[pj.id::text], pj.code INTO v_proj, v_pname FROM public.projects pj
     WHERE public.sofia_norm(pj.code) = public.sofia_norm(trim(p_proyecto))
        OR public.sofia_norm(pj.code || ' ' || pj.name) LIKE '%' || public.sofia_norm(trim(p_proyecto)) || '%'
     ORDER BY (public.sofia_norm(pj.code) = public.sofia_norm(trim(p_proyecto))) DESC
     LIMIT 1;
  END IF;

  SELECT a.id INTO v_ship FROM public.shipping_addresses a
   ORDER BY (a.sede_id IS NOT DISTINCT FROM d.sede_id) DESC, a.created_at
   LIMIT 1;
  SELECT a.id INTO v_bill FROM public.billing_addresses a
   ORDER BY (a.sede_id IS NOT DISTINCT FROM d.sede_id) DESC, a.created_at
   LIMIT 1;

  v_items := jsonb_build_array(jsonb_build_object(
    'productName',   coalesce(ri.product_name, p_producto),
    'catalogNumber', coalesce(ri.catalog_number, ''),
    'quantity',      p_cantidad,
    'unitPrice',     ri.unit_price,
    'format',        ri.format,
    'link',          ri.link,
    'notes',         ri.notes,
    'brand',         ri.brand
  ));

  -- create_request_with_items no está en las migraciones del repo: se leen los tipos
  -- de sus parámetros del catálogo, para pasarle cada valor con el tipo que espera.
  SELECT string_agg(format('%s => $%s::%s', x.nm, x.ord, format_type(x.typ, NULL)), ', ' ORDER BY x.ord)
    INTO v_call
    FROM (
      SELECT a.nm, a.typ,
             CASE a.nm WHEN 'vendor_id_in' THEN 1 WHEN 'account_manager_id_in' THEN 2
                       WHEN 'shipping_address_id_in' THEN 3 WHEN 'billing_address_id_in' THEN 4
                       WHEN 'notes_in' THEN 5 WHEN 'project_codes_in' THEN 6 WHEN 'items_in' THEN 7 END AS ord
        FROM pg_proc pp
        CROSS JOIN LATERAL unnest(coalesce(pp.proallargtypes, pp.proargtypes::oid[]), pp.proargnames) AS a(typ, nm)
       WHERE pp.proname = 'create_request_with_items' AND pp.pronamespace = 'public'::regnamespace
         AND a.nm IN ('vendor_id_in', 'account_manager_id_in', 'shipping_address_id_in', 'billing_address_id_in',
                      'notes_in', 'project_codes_in', 'items_in')
    ) x;
  IF v_call IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No encuentro la funcion create_request_with_items en la base de datos.');
  END IF;

  EXECUTE 'SELECT to_jsonb(t) FROM public.create_request_with_items(' || v_call || ') AS t'
    INTO v_res
    USING v_vendor::text, NULL::text, v_ship::text, v_bill::text,
          trim(both ' ' from coalesce(p_notas, '') || ' (Pedido por voz con ' || d.nombre || ')'),
          v_proj::text, v_items::text;
  -- la función puede devolver la fila o un json; en ambos casos buscamos id y número
  v_req := CASE WHEN v_res ? 'id' THEN v_res ELSE (SELECT value FROM jsonb_each(v_res) LIMIT 1) END;

  -- a quién avisar (lo mismo que hace la app al crear una solicitud)
  SELECT coalesce(jsonb_agg(p.id), '[]'::jsonb) INTO v_notify
    FROM public.profiles p WHERE p.role = 'Admin' AND p.notify_on_new_request;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_req->>'id',
    'numero', coalesce(v_req->>'request_number', left(v_req->>'id', 8)),
    'producto', coalesce(ri.product_name, p_producto),
    'cantidad', p_cantidad,
    'proveedor', v_vname,
    'proyecto', v_pname,
    'avisar', v_notify
  );
END;
$$;

-- Quién puede llamar a qué
REVOKE ALL ON FUNCTION public.sofia_pair_start(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sofia_pair_poll(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sofia_pair_claim(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sofia_config(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sofia_buscar_producto(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sofia_pedir(text, text, numeric, uuid, text, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.sofia_pair_start(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sofia_pair_poll(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sofia_pair_claim(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sofia_config(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sofia_buscar_producto(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sofia_pedir(text, text, numeric, uuid, text, text, text) TO anon, authenticated;
