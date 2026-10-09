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

-- Por si la función, después de insertar, cambia el estado en la misma operación
-- (en la misma transacción, now() es el mismo instante en que se creó la fila):
-- ese primer cambio no vale y se queda en "Pending". Los cambios que se hacen
-- después desde la app van en otra transacción y pasan sin tocar.
CREATE OR REPLACE FUNCTION public.requests_estado_inicial_upd()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status::text = 'Pending' AND NEW.status IS DISTINCT FROM OLD.status
     AND OLD.created_at = now() THEN   -- misma transacción que la creó
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS requests_estado_inicial_upd ON public.requests;
CREATE TRIGGER requests_estado_inicial_upd
  BEFORE UPDATE OF status ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.requests_estado_inicial_upd();

-- Las que se crearon hoy ya como "Quote Requested" sin presupuesto ni PO: vuelven a "Pending"
UPDATE public.requests
   SET status = 'Pending'
 WHERE status::text = 'Quote Requested'
   AND created_at >= date_trunc('day', now())
   AND quote_url IS NULL AND po_number IS NULL;

-- Comprobación: las últimas solicitudes y su estado
SELECT request_number, status, to_char(created_at, 'DD/MM HH24:MI') AS creada,
       (SELECT count(*) FROM pg_trigger t WHERE t.tgrelid = 'public.requests'::regclass AND t.tgname LIKE 'requests_estado_inicial%') AS triggers_instalados
  FROM public.requests ORDER BY created_at DESC LIMIT 5;
