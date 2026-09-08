-- Aplicar el sistema de permisos a las tablas
-- =================================================================
-- Segunda parte de 20260908140000_permissions_system.sql. Sustituye las
-- politicas de acceso de las tablas por otras que preguntan a
-- has_permission(), de forma que la matriz del panel de Admin mande de verdad
-- y no solo en la interfaz.
--
-- Antes de esto, cualquier usuario autenticado podia leer, insertar, cambiar y
-- borrar en casi todo: la diferencia entre roles era cosmetica.
--
-- Dos tablas quedan fuera a proposito, porque no son de permisos configurables
-- sino de "cada uno lo suyo": fcm_tokens y user_notification_preferences.
--
-- Marcha atras: supabase/rollback/20260908140000_permissions_system_down.sql

-- ------------------------------------------------------------------
-- 1) Limpiar las politicas antiguas de las tablas que pasamos a gestionar.
--    Se borran por tabla y no por nombre porque los nombres actuales son un
--    historial de parches ("Admins and AMs can manage ...", "Permitir borrado
--    a autenticados", etc.) y no queremos dejar ninguna suelta: una politica
--    permisiva olvidada haria inutil todo lo demas.
-- ------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (ARRAY[
        'requests', 'request_items', 'vendors', 'projects', 'account_managers',
        'email_templates', 'shipping_addresses', 'billing_addresses',
        'inventory', 'expenditures', 'packing_slips', 'received_items',
        'invoices', 'invoiced_items', 'email_logs', 'profiles'
      ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ------------------------------------------------------------------
-- 2) Solicitudes
-- ------------------------------------------------------------------
-- Verlas es la base del trabajo diario, asi que no se restringe: el filtro
-- esta en quien puede tocarlas.
CREATE POLICY requests_select ON public.requests
  FOR SELECT TO authenticated USING (true);

CREATE POLICY requests_insert ON public.requests
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('requests.create'));

-- El que la pidio siempre puede corregir la suya. Recibir tambien cambia la
-- solicitud (pasa a Received), de ahi el tercer caso.
CREATE POLICY requests_update ON public.requests
  FOR UPDATE TO authenticated
  USING (
    public.has_permission('requests.edit_any')
    OR requester_id = auth.uid()
    OR public.has_permission('reception.receive')
  )
  WITH CHECK (
    public.has_permission('requests.edit_any')
    OR requester_id = auth.uid()
    OR public.has_permission('reception.receive')
  );

CREATE POLICY requests_delete ON public.requests
  FOR DELETE TO authenticated
  USING (
    public.has_permission('requests.delete_any')
    OR requester_id = auth.uid()
  );

-- ------------------------------------------------------------------
-- 3) Articulos de las solicitudes
-- ------------------------------------------------------------------
CREATE POLICY request_items_select ON public.request_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY request_items_write ON public.request_items
  FOR ALL TO authenticated
  USING (
    public.has_permission('requests.create')
    OR public.has_permission('requests.edit_any')
    OR public.has_permission('reception.receive')
  )
  WITH CHECK (
    public.has_permission('requests.create')
    OR public.has_permission('requests.edit_any')
    OR public.has_permission('reception.receive')
  );

-- ------------------------------------------------------------------
-- 4) Proveedores
-- ------------------------------------------------------------------
-- Ojo: sin 'vendors.view' no se puede crear una solicitud, porque hay que
-- elegir proveedor. Quien pueda crear solicitudes deberia poder verlos.
CREATE POLICY vendors_select ON public.vendors
  FOR SELECT TO authenticated
  USING (public.has_permission('vendors.view'));

CREATE POLICY vendors_write ON public.vendors
  FOR ALL TO authenticated
  USING (public.has_permission('vendors.manage'))
  WITH CHECK (public.has_permission('vendors.manage'));

-- ------------------------------------------------------------------
-- 5) Maestros: los formularios los necesitan, asi que se leen siempre y se
--    protege solo la escritura.
-- ------------------------------------------------------------------
CREATE POLICY projects_select ON public.projects
  FOR SELECT TO authenticated USING (true);
CREATE POLICY projects_write ON public.projects
  FOR ALL TO authenticated
  USING (public.has_permission('projects.manage'))
  WITH CHECK (public.has_permission('projects.manage'));

CREATE POLICY account_managers_select ON public.account_managers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY account_managers_write ON public.account_managers
  FOR ALL TO authenticated
  USING (public.has_permission('account_managers.manage'))
  WITH CHECK (public.has_permission('account_managers.manage'));

CREATE POLICY shipping_addresses_select ON public.shipping_addresses
  FOR SELECT TO authenticated USING (true);
CREATE POLICY shipping_addresses_write ON public.shipping_addresses
  FOR ALL TO authenticated
  USING (public.has_permission('addresses.manage'))
  WITH CHECK (public.has_permission('addresses.manage'));

CREATE POLICY billing_addresses_select ON public.billing_addresses
  FOR SELECT TO authenticated USING (true);
CREATE POLICY billing_addresses_write ON public.billing_addresses
  FOR ALL TO authenticated
  USING (public.has_permission('addresses.manage'))
  WITH CHECK (public.has_permission('addresses.manage'));

CREATE POLICY email_templates_select ON public.email_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY email_templates_write ON public.email_templates
  FOR ALL TO authenticated
  USING (public.has_permission('email_templates.manage'))
  WITH CHECK (public.has_permission('email_templates.manage'));

-- ------------------------------------------------------------------
-- 6) Inventario
-- ------------------------------------------------------------------
CREATE POLICY inventory_select ON public.inventory
  FOR SELECT TO authenticated
  USING (public.has_permission('inventory.view'));

-- Recibir un pedido da de alta articulos y actualiza existencias, por eso
-- 'reception.receive' tambien escribe aqui.
CREATE POLICY inventory_insert ON public.inventory
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission('inventory.manage')
    OR public.has_permission('reception.receive')
  );

CREATE POLICY inventory_update ON public.inventory
  FOR UPDATE TO authenticated
  USING (
    public.has_permission('inventory.manage')
    OR public.has_permission('reception.receive')
  )
  WITH CHECK (
    public.has_permission('inventory.manage')
    OR public.has_permission('reception.receive')
  );

CREATE POLICY inventory_delete ON public.inventory
  FOR DELETE TO authenticated
  USING (public.has_permission('inventory.manage'));

-- ------------------------------------------------------------------
-- 7) Gastos
-- ------------------------------------------------------------------
CREATE POLICY expenditures_select ON public.expenditures
  FOR SELECT TO authenticated
  USING (public.has_permission('expenditures.view'));

CREATE POLICY expenditures_write ON public.expenditures
  FOR ALL TO authenticated
  USING (public.has_permission('expenditures.manage'))
  WITH CHECK (public.has_permission('expenditures.manage'));

-- ------------------------------------------------------------------
-- 8) Recepcion y documentos
-- ------------------------------------------------------------------
CREATE POLICY packing_slips_select ON public.packing_slips
  FOR SELECT TO authenticated
  USING (public.has_permission('documents.view'));
CREATE POLICY packing_slips_write ON public.packing_slips
  FOR ALL TO authenticated
  USING (public.has_permission('reception.receive'))
  WITH CHECK (public.has_permission('reception.receive'));

CREATE POLICY received_items_select ON public.received_items
  FOR SELECT TO authenticated
  USING (public.has_permission('documents.view'));
CREATE POLICY received_items_write ON public.received_items
  FOR ALL TO authenticated
  USING (public.has_permission('reception.receive'))
  WITH CHECK (public.has_permission('reception.receive'));

CREATE POLICY invoices_select ON public.invoices
  FOR SELECT TO authenticated
  USING (public.has_permission('documents.view'));
CREATE POLICY invoices_write ON public.invoices
  FOR ALL TO authenticated
  USING (
    public.has_permission('reception.receive')
    OR public.has_permission('requests.edit_any')
  )
  WITH CHECK (
    public.has_permission('reception.receive')
    OR public.has_permission('requests.edit_any')
  );

CREATE POLICY invoiced_items_select ON public.invoiced_items
  FOR SELECT TO authenticated
  USING (public.has_permission('documents.view'));
CREATE POLICY invoiced_items_write ON public.invoiced_items
  FOR ALL TO authenticated
  USING (
    public.has_permission('reception.receive')
    OR public.has_permission('requests.edit_any')
  )
  WITH CHECK (
    public.has_permission('reception.receive')
    OR public.has_permission('requests.edit_any')
  );

-- ------------------------------------------------------------------
-- 9) Registro de correos: lo escribe la propia aplicacion al enviar.
-- ------------------------------------------------------------------
CREATE POLICY email_logs_select ON public.email_logs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY email_logs_insert ON public.email_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY email_logs_delete ON public.email_logs
  FOR DELETE TO authenticated
  USING (public.has_permission('users.manage'));

-- ------------------------------------------------------------------
-- 10) Perfiles
--
-- Esta es la tabla delicada: si nadie puede leer su propio perfil, la
-- aplicacion se queda cargando para siempre. Leerlos sigue abierto a los
-- usuarios de la casa, porque el panel de Admin lista a todo el mundo y las
-- solicitudes muestran quien las pidio.
-- ------------------------------------------------------------------
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- El alta la hace el trigger de registro con el id del propio usuario.
CREATE POLICY profiles_insert ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.has_permission('users.manage'));

CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_permission('users.manage'))
  WITH CHECK (id = auth.uid() OR public.has_permission('users.manage'));

CREATE POLICY profiles_delete ON public.profiles
  FOR DELETE TO authenticated
  USING (public.has_permission('users.manage'));
