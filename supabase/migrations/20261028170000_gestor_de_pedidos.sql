-- Gestor de pedidos: rol de acceso, distinto del gerente de cuenta.
-- El gerente de cuenta sigue siendo un contacto de la solicitud (account_managers),
-- no alguien que entra en LabFlow.
-- El gestor hace el trabajo de compras del administrador, sin invitar,
-- cambiar roles ni tocar la matriz de permisos.

INSERT INTO public.role_permissions (role, permission_key, allowed)
SELECT 'Order Manager', key, key NOT IN ('users.manage', 'permissions.manage')
FROM public.permissions
ON CONFLICT (role, permission_key) DO UPDATE
  SET allowed = EXCLUDED.allowed;
