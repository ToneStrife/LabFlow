-- Los solicitantes pueden editar proveedores si tienen vendors.manage
-- =================================================================
-- La matriz ya concede 'vendors.manage' (anadir, editar y borrar), pero
-- un UPDATE en Postgres tambien tiene que poder leer la fila antes y
-- despues del cambio. Si esa lectura no pasa, PostgREST no devuelve
-- error: devuelve cero filas y la pantalla dice que no se guardo,
-- aunque el interruptor de la matriz este encendido.
--
-- Se separan las operaciones. Quien puede gestionar tambien puede leer
-- la fila que acaba de cambiar, y se vuelve a conceder UPDATE por si
-- el privilegio de tabla no estaba.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'vendors'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.vendors', r.policyname);
  END LOOP;
END $$;

CREATE POLICY vendors_select ON public.vendors
  FOR SELECT TO authenticated
  USING (
    public.has_permission('vendors.view')
    OR public.has_permission('vendors.manage')
  );

CREATE POLICY vendors_insert ON public.vendors
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('vendors.manage'));

CREATE POLICY vendors_update ON public.vendors
  FOR UPDATE TO authenticated
  USING (public.has_permission('vendors.manage'))
  WITH CHECK (public.has_permission('vendors.manage'));

CREATE POLICY vendors_delete ON public.vendors
  FOR DELETE TO authenticated
  USING (public.has_permission('vendors.manage'));
