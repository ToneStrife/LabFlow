-- Los permisos efectivos del usuario que llama.
--
-- La interfaz necesita saber que puede hacer la persona para pintar el menu y
-- las pantallas. Podria calcularlo leyendo las tres tablas y repitiendo la
-- logica en JavaScript, pero entonces habria dos versiones de la misma regla y
-- acabarian discrepando. Preguntamos a la misma funcion que usan las politicas.

CREATE OR REPLACE FUNCTION public.my_permissions()
RETURNS TABLE (permission_key text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.key
  FROM public.permissions p
  WHERE public.has_permission(p.key);
$$;

GRANT EXECUTE ON FUNCTION public.my_permissions() TO authenticated;
