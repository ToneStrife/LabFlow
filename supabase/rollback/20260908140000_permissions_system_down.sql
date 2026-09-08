-- Marcha atras del sistema de permisos.
--
-- Deja la base de datos como estaba antes de 20260908140000_permissions_system.sql.
-- Vive fuera de supabase/migrations a proposito, para que "supabase db push" no
-- lo aplique solo: esto se ejecuta a mano y a conciencia.
--
-- Ojo: al borrar las tablas se pierde la matriz de permisos que hayas
-- configurado. Si solo quieres desbloquear a alguien, es mejor darle el
-- permiso en la matriz que ejecutar esto.

-- 1) Fuera las politicas que dependen de has_permission(). Sin esto, el DROP
--    de la funcion falla y ademas las tablas se quedarian sin ninguna politica
--    permisiva, o sea con todo el mundo bloqueado.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual LIKE '%has_permission%' OR with_check LIKE '%has_permission%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- 2) Devolver el acceso amplio que habia antes: cualquier usuario autenticado.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'requests', 'request_items', 'vendors', 'projects', 'inventory',
    'expenditures', 'account_managers', 'email_templates', 'packing_slips',
    'received_items', 'invoices', 'invoiced_items', 'shipping_addresses',
    'billing_addresses', 'email_logs', 'profiles'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
               WHERE n.nspname='public' AND c.relname=t AND c.relkind='r') THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
        t || '_authenticated_all_rollback', t);
    END IF;
  END LOOP;
END $$;

-- 3) Fuera el sistema de permisos.
DROP FUNCTION IF EXISTS public.has_permission(text);
DROP FUNCTION IF EXISTS public.is_admin();
DROP TABLE IF EXISTS public.user_permissions;
DROP TABLE IF EXISTS public.role_permissions;
DROP TABLE IF EXISTS public.permissions;
