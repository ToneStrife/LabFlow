-- SofIA es solo de la persona propietaria, que la tiene por ser propietaria
-- y además por excepción personal. Ningún rol la trae de serie.
UPDATE public.role_permissions
   SET allowed = false
 WHERE permission_key IN ('sofia.use', 'sofia.firmware');
