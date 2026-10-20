-- Dos correos por proveedor: uno para presupuestos y otro para pedidos al proveedor.
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS email_presupuesto text,
  ADD COLUMN IF NOT EXISTS email_pedido text;

COMMENT ON COLUMN public.vendors.email_presupuesto IS
  'Correo para solicitudes de presupuesto (Quote Request)';
COMMENT ON COLUMN public.vendors.email_pedido IS
  'Correo para confirmación de pedido al proveedor (Order Confirmation)';

-- Si ya había un email genérico, lo usamos de partida en ambos.
UPDATE public.vendors
   SET email_presupuesto = coalesce(nullif(trim(email_presupuesto), ''), nullif(trim(email), '')),
       email_pedido = coalesce(nullif(trim(email_pedido), ''), nullif(trim(email), ''))
 WHERE email IS NOT NULL AND trim(email) <> '';
