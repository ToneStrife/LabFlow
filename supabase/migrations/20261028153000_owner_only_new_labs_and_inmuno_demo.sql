-- Solo el propietario puede crear laboratorios.
-- Inmuno Demo: laboratorio de prueba, con usuario demo y datos falsos.

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
  IF NOT public.am_i_owner() THEN
    RAISE EXCEPTION 'Solo el propietario puede crear laboratorios';
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

DROP POLICY IF EXISTS labs_write ON public.labs;
DROP POLICY IF EXISTS labs_insert ON public.labs;
DROP POLICY IF EXISTS labs_update ON public.labs;
DROP POLICY IF EXISTS labs_delete ON public.labs;

CREATE POLICY labs_insert ON public.labs
  FOR INSERT TO authenticated
  WITH CHECK (public.am_i_owner());

CREATE POLICY labs_update ON public.labs
  FOR UPDATE TO authenticated
  USING (public.am_i_owner())
  WITH CHECK (public.am_i_owner());

CREATE POLICY labs_delete ON public.labs
  FOR DELETE TO authenticated
  USING (public.am_i_owner());

-- Usuario para enseñar el laboratorio. Contraseña de demostración, no es una cuenta real.
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'b0000000-0000-4000-8000-0000000000d1',
  'authenticated',
  'authenticated',
  'inmuno.demo@lab-flow.es',
  extensions.crypt('Inmuno-demo-2026', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"first_name":"Demo","last_name":"Inmuno"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now());

INSERT INTO auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES (
  'b0000000-0000-4000-8000-0000000000d1',
  'b0000000-0000-4000-8000-0000000000d1',
  'b0000000-0000-4000-8000-0000000000d1',
  jsonb_build_object(
    'sub', 'b0000000-0000-4000-8000-0000000000d1',
    'email', 'inmuno.demo@lab-flow.es',
    'email_verified', true
  ),
  'email',
  now(),
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, first_name, last_name, email, role, is_owner)
VALUES (
  'b0000000-0000-4000-8000-0000000000d1',
  'Demo',
  'Inmuno',
  'inmuno.demo@lab-flow.es',
  'Requester',
  false
)
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  role = 'Requester',
  is_owner = false;

UPDATE public.labs
SET
  name = 'Inmuno Demo',
  description = 'Laboratorio de demostración. Los pedidos, proveedores y personas son inventados.',
  activo = true
WHERE id = 'b0000000-0000-4000-8000-000000000002';

UPDATE public.sedes
SET
  name = 'Inmunología',
  tipo = 'otro',
  color = '#0f766e',
  descripcion = 'Sede de demostración',
  hero_gradient = 'linear-gradient(135deg, #134e4a 0%, #0f766e 50%, #5eead4 100%)',
  activo = true
WHERE id = 'inmuno-demo-farmacia';

INSERT INTO public.lab_members (lab_id, user_id, role, smtp_from)
VALUES
  (
    'b0000000-0000-4000-8000-000000000002',
    '407e7bcc-b4e3-4078-afe4-9e009ac1247a',
    'admin_lab',
    'cjaranda@go.ugr.es'
  ),
  (
    'b0000000-0000-4000-8000-000000000002',
    'b0000000-0000-4000-8000-0000000000d1',
    'member',
    NULL
  )
ON CONFLICT (lab_id, user_id) DO UPDATE SET
  role = EXCLUDED.role,
  smtp_from = EXCLUDED.smtp_from;

-- Correos de prueba: el mismo buzón, para poder enviar sin escribir a una empresa real.
INSERT INTO public.vendors (
  id, name, contact_person, email, email_presupuesto, email_pedido, phone, notes, scope, lab_id
)
VALUES (
  'b0000000-0000-4000-8000-0000000000a1',
  'Reactivos Imaginarios',
  'Carlos (prueba)',
  'cjaranda@go.ugr.es',
  'cjaranda@go.ugr.es',
  'cjaranda@go.ugr.es',
  '600 000 000',
  'Proveedor ficticio. El correo es el de prueba, no el de una empresa.',
  'lab',
  'b0000000-0000-4000-8000-000000000002'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  contact_person = EXCLUDED.contact_person,
  email = EXCLUDED.email,
  email_presupuesto = EXCLUDED.email_presupuesto,
  email_pedido = EXCLUDED.email_pedido,
  notes = EXCLUDED.notes,
  scope = EXCLUDED.scope,
  lab_id = EXCLUDED.lab_id;

INSERT INTO public.account_managers (id, first_name, last_name, email)
VALUES (
  'b0000000-0000-4000-8000-0000000000f1',
  'Gerente',
  'Demo',
  'cjaranda@go.ugr.es'
)
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email;

INSERT INTO public.projects (id, name, code, lab_id)
VALUES (
  'b0000000-0000-4000-8000-0000000000b1',
  'Proyecto demostración',
  'DEMO-INMUNO',
  'b0000000-0000-4000-8000-000000000002'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  lab_id = EXCLUDED.lab_id;

INSERT INTO public.shipping_addresses (
  id, name, address_line_1, city, state, zip_code, country, sede_id
)
VALUES (
  'b0000000-0000-4000-8000-0000000000c1',
  'Inmuno Demo',
  'Avenida de la Demostración 1',
  'Granada',
  'Granada',
  '18001',
  'España',
  'inmuno-demo-farmacia'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  sede_id = EXCLUDED.sede_id;

INSERT INTO public.requests (
  id, vendor_id, requester_id, account_manager_id, status, notes, project_codes,
  shipping_address_id, request_number, lab_id, sede_id
)
VALUES
  (
    'b0000000-0000-4000-8000-0000000000e1',
    'b0000000-0000-4000-8000-0000000000a1',
    'b0000000-0000-4000-8000-0000000000d1',
    'b0000000-0000-4000-8000-0000000000f1',
    'Quote Pending',
    'Pedido de demostración. No es real.',
    ARRAY['b0000000-0000-4000-8000-0000000000b1'],
    'b0000000-0000-4000-8000-0000000000c1',
    'DEMO-101',
    'b0000000-0000-4000-8000-000000000002',
    'inmuno-demo-farmacia'
  ),
  (
    'b0000000-0000-4000-8000-0000000000e2',
    'b0000000-0000-4000-8000-0000000000a1',
    'b0000000-0000-4000-8000-0000000000d1',
    'b0000000-0000-4000-8000-0000000000f1',
    'Ordered',
    'Pedido de demostración, marcado como enviado.',
    ARRAY['b0000000-0000-4000-8000-0000000000b1'],
    'b0000000-0000-4000-8000-0000000000c1',
    'DEMO-102',
    'b0000000-0000-4000-8000-000000000002',
    'inmuno-demo-farmacia'
  ),
  (
    'b0000000-0000-4000-8000-0000000000e3',
    'b0000000-0000-4000-8000-0000000000a1',
    'b0000000-0000-4000-8000-0000000000d1',
    'b0000000-0000-4000-8000-0000000000f1',
    'Received',
    'Pedido de demostración, ya recibido.',
    ARRAY['b0000000-0000-4000-8000-0000000000b1'],
    'b0000000-0000-4000-8000-0000000000c1',
    'DEMO-103',
    'b0000000-0000-4000-8000-000000000002',
    'inmuno-demo-farmacia'
  )
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  lab_id = EXCLUDED.lab_id,
  sede_id = EXCLUDED.sede_id,
  account_manager_id = EXCLUDED.account_manager_id,
  vendor_id = EXCLUDED.vendor_id;

INSERT INTO public.request_items (request_id, product_name, catalog_number, quantity, unit_price, format, brand, notes)
SELECT v.request_id, v.product_name, v.catalog_number, v.quantity, v.unit_price, v.format, v.brand, v.notes
FROM (
  VALUES
    ('b0000000-0000-4000-8000-0000000000e1'::uuid, 'Anticuerpo anti-CD3 (demo)', 'DEMO-CD3', 1, 120.00, '100 µg', 'Imaginario', 'Artículo ficticio'),
    ('b0000000-0000-4000-8000-0000000000e1'::uuid, 'PBS 1× (demo)', 'DEMO-PBS', 2, 18.50, '500 ml', 'Imaginario', 'Artículo ficticio'),
    ('b0000000-0000-4000-8000-0000000000e2'::uuid, 'Tubos 50 ml (demo)', 'DEMO-T50', 4, 9.00, 'bolsa 25', 'Imaginario', 'Artículo ficticio'),
    ('b0000000-0000-4000-8000-0000000000e3'::uuid, 'Puntas con filtro (demo)', 'DEMO-TIP', 1, 42.00, 'caja', 'Imaginario', 'Artículo ficticio')
) AS v(request_id, product_name, catalog_number, quantity, unit_price, format, brand, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.request_items i
  WHERE i.request_id = v.request_id AND i.catalog_number = v.catalog_number
);
