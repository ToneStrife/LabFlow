-- La pantalla no puede leer smtp_password (está revocada a propósito).
-- Sin esta columna, el listado no sabe si hay contraseña y siempre muestra
-- "Pendiente", aunque el guardado haya funcionado.
-- has_password solo dice sí o no. No devuelve la contraseña.

ALTER TABLE public.smtp_accounts
  ADD COLUMN IF NOT EXISTS has_password boolean
  GENERATED ALWAYS AS (length(btrim(coalesce(smtp_password, ''))) > 0) STORED;

GRANT SELECT (has_password) ON public.smtp_accounts TO authenticated;

NOTIFY pgrst, 'reload schema';
