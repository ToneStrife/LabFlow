-- Gmail/Workspace autentica con el correo completo como usuario SMTP.
-- Corrige filas guardadas solo con el nombre local (p. ej. «niceto»).

UPDATE public.smtp_accounts
SET
  smtp_user = email,
  updated_at = now()
WHERE
  (
    email LIKE '%@gmail.com'
    OR email LIKE '%@googlemail.com'
    OR email LIKE '%@go.ugr.es'
    OR email LIKE '%@ugr.es'
  )
  AND (smtp_user IS NULL OR position('@' in smtp_user) = 0);
