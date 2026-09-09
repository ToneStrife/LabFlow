-- Sede por defecto en perfiles y sede en direcciones de envío/facturación.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_sede_id text;

ALTER TABLE public.shipping_addresses
  ADD COLUMN IF NOT EXISTS sede_id text;

ALTER TABLE public.billing_addresses
  ADD COLUMN IF NOT EXISTS sede_id text;

COMMENT ON COLUMN public.profiles.default_sede_id IS 'Sede por defecto del usuario; NULL = Todas las sedes';
COMMENT ON COLUMN public.shipping_addresses.sede_id IS 'Sede a la que pertenece la dirección de envío';
COMMENT ON COLUMN public.billing_addresses.sede_id IS 'Sede a la que pertenece la dirección de facturación';
