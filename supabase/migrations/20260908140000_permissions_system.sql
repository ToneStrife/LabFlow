-- Sistema de permisos de LabFlow
-- =================================================================
-- Hasta ahora los permisos vivian solo en el frontend: permissions.ts, los
-- roles del menu y los requiredRoles de las rutas. Las politicas de Supabase
-- concedian todo a cualquier usuario autenticado, asi que la separacion entre
-- roles era cosmetica y se saltaba desde la consola del navegador.
--
-- Este sistema mueve la decision a la base de datos, en tres piezas:
--   permissions        catalogo de lo que se puede permitir
--   role_permissions   que puede hacer cada rol
--   user_permissions   excepciones para una persona concreta
--
-- La funcion has_permission() resuelve las tres y la usan tanto las politicas
-- RLS como la aplicacion, para que interfaz y servidor no puedan discrepar.
--
-- Aplicar con: supabase db push   o pegandolo en el SQL Editor.
-- La vuelta atras esta en supabase/rollback/20260908140000_permissions_system_down.sql

-- ------------------------------------------------------------------
-- 1) Catalogo de permisos
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.permissions (
  key         text PRIMARY KEY,
  label       text NOT NULL,
  description text,
  category    text NOT NULL DEFAULT 'General',
  sort_order  integer NOT NULL DEFAULT 100
);

-- ------------------------------------------------------------------
-- 2) Permisos por rol
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role           text NOT NULL,
  permission_key text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  allowed        boolean NOT NULL DEFAULT false,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role, permission_key)
);

-- ------------------------------------------------------------------
-- 3) Excepciones por persona. Mandan sobre lo que diga su rol.
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_permissions (
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  allowed        boolean NOT NULL,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, permission_key)
);

-- ------------------------------------------------------------------
-- 4) Funciones
-- ------------------------------------------------------------------

-- SECURITY DEFINER a proposito: si leyese profiles con los permisos de quien
-- llama, la propia politica de profiles volveria a llamar aqui y se morderia
-- la cola.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role::text = 'Admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(p_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    -- Salvaguarda: un administrador nunca puede quedarse fuera de la gestion
    -- de usuarios y permisos. Sin esto, quitarse a uno mismo esa casilla en la
    -- matriz dejaria la aplicacion sin forma de volver atras.
    WHEN p_key IN ('permissions.manage', 'users.manage') AND public.is_admin()
      THEN true
    ELSE COALESCE(
      -- 1. la excepcion de la persona
      (SELECT up.allowed
         FROM public.user_permissions up
        WHERE up.user_id = auth.uid()
          AND up.permission_key = p_key),
      -- 2. lo que diga su rol
      (SELECT rp.allowed
         FROM public.role_permissions rp
         JOIN public.profiles pr ON pr.role::text = rp.role
        WHERE pr.id = auth.uid()
          AND rp.permission_key = p_key),
      -- 3. lo que no se concede, se niega
      false
    )
  END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated;

-- ------------------------------------------------------------------
-- 5) Catalogo inicial
-- ------------------------------------------------------------------
INSERT INTO public.permissions (key, label, description, category, sort_order) VALUES
  ('requests.create',          'Crear solicitudes',            'Dar de alta nuevas solicitudes de compra',                  'Solicitudes',  10),
  ('requests.approve',         'Aprobar solicitudes',          'Aprobar o rechazar las que estan pendientes',               'Solicitudes',  20),
  ('requests.edit_any',        'Editar cualquier solicitud',   'Modificar solicitudes de otras personas',                   'Solicitudes',  30),
  ('requests.delete_any',      'Borrar cualquier solicitud',   'Borrar solicitudes de otras personas',                      'Solicitudes',  40),
  ('requests.override_status', 'Forzar el estado',             'Saltarse el flujo normal y fijar el estado a mano',         'Solicitudes',  50),
  ('reception.receive',        'Recibir pedidos',              'Registrar albaranes y articulos recibidos',                 'Recepcion',    60),
  ('inventory.view',           'Ver inventario',               NULL,                                                       'Inventario',   70),
  ('inventory.manage',         'Gestionar inventario',         'Anadir, editar y borrar articulos del inventario',          'Inventario',   80),
  ('vendors.view',             'Ver proveedores',              NULL,                                                       'Proveedores',  90),
  ('vendors.manage',           'Gestionar proveedores',        'Anadir, editar y borrar proveedores',                       'Proveedores', 100),
  ('documents.view',           'Ver documentos',               'Presupuestos, albaranes y facturas',                        'Documentos',  110),
  ('expenditures.view',        'Ver gastos',                   NULL,                                                       'Gastos',      120),
  ('expenditures.manage',      'Gestionar gastos',             'Anadir, importar y borrar gastos',                          'Gastos',      130),
  ('projects.manage',          'Gestionar proyectos',          NULL,                                                       'Maestros',    140),
  ('account_managers.manage',  'Gestionar gerentes de cuenta', NULL,                                                       'Maestros',    150),
  ('addresses.manage',         'Gestionar direcciones',        'Direcciones de envio y facturacion',                        'Maestros',    160),
  ('email_templates.manage',   'Gestionar plantillas de email',NULL,                                                       'Maestros',    170),
  ('notifications.send',       'Enviar notificaciones',        NULL,                                                       'Maestros',    180),
  ('users.manage',             'Gestionar usuarios',           'Invitar, cambiar rol y dar de baja',                        'Administracion', 190),
  ('permissions.manage',       'Gestionar permisos',           'Cambiar esta misma matriz',                                 'Administracion', 200)
ON CONFLICT (key) DO UPDATE
  SET label = EXCLUDED.label,
      description = EXCLUDED.description,
      category = EXCLUDED.category,
      sort_order = EXCLUDED.sort_order;

-- ------------------------------------------------------------------
-- 6) Valores de partida
--
-- Reproducen lo que la interfaz permite hoy, con un solo cambio pedido: los
-- solicitantes pasan a ver y anadir proveedores.
-- ------------------------------------------------------------------

-- El administrador lo puede todo.
INSERT INTO public.role_permissions (role, permission_key, allowed)
SELECT 'Admin', key, true FROM public.permissions
ON CONFLICT (role, permission_key) DO NOTHING;

-- Gerente de cuenta.
INSERT INTO public.role_permissions (role, permission_key, allowed)
SELECT 'Account Manager', key,
       key IN ('requests.create', 'reception.receive', 'inventory.view',
               'inventory.manage', 'vendors.view', 'vendors.manage',
               'documents.view')
FROM public.permissions
ON CONFLICT (role, permission_key) DO NOTHING;

-- Solicitante.
INSERT INTO public.role_permissions (role, permission_key, allowed)
SELECT 'Requester', key,
       key IN ('requests.create', 'reception.receive', 'inventory.view',
               'vendors.view', 'vendors.manage', 'documents.view')
FROM public.permissions
ON CONFLICT (role, permission_key) DO NOTHING;

-- ------------------------------------------------------------------
-- 7) Quien puede leer y tocar estas tres tablas
-- ------------------------------------------------------------------
ALTER TABLE public.permissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Todo el mundo necesita leerlas: la interfaz decide con esto que pinta.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='permissions' AND policyname='permissions_read') THEN
    CREATE POLICY permissions_read ON public.permissions FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='role_permissions' AND policyname='role_permissions_read') THEN
    CREATE POLICY role_permissions_read ON public.role_permissions FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_permissions' AND policyname='user_permissions_read') THEN
    CREATE POLICY user_permissions_read ON public.user_permissions FOR SELECT TO authenticated USING (true);
  END IF;

  -- Cambiarlas, solo quien gestiona permisos.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='role_permissions' AND policyname='role_permissions_write') THEN
    CREATE POLICY role_permissions_write ON public.role_permissions FOR ALL TO authenticated
      USING (public.has_permission('permissions.manage'))
      WITH CHECK (public.has_permission('permissions.manage'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_permissions' AND policyname='user_permissions_write') THEN
    CREATE POLICY user_permissions_write ON public.user_permissions FOR ALL TO authenticated
      USING (public.has_permission('permissions.manage'))
      WITH CHECK (public.has_permission('permissions.manage'));
  END IF;

  -- El catalogo lo gestionan las migraciones, no la aplicacion.
END $$;
