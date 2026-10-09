-- Toda solicitud nueva empieza en "Pending" (en pantalla: Pendiente de presupuesto)
-- =================================================================
-- La función que crea las solicitudes (create_request_with_items) no está en
-- el repo y en la base hay dos versiones; alguna las estaba creando ya como
-- "Quote Requested" (Cotización solicitada). En vez de depender de cuál se
-- use, este trigger fija el estado inicial al insertar, venga de la app, de
-- Sofía o de donde sea. Los cambios de estado posteriores no se tocan.

CREATE OR REPLACE FUNCTION public.requests_estado_inicial()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.status := 'Pending';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS requests_estado_inicial ON public.requests;
CREATE TRIGGER requests_estado_inicial
  BEFORE INSERT ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.requests_estado_inicial();
