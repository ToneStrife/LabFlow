-- Las solicitudes nuevas ya no esperan la aprobación de un admin o del IP.
-- Nacen en «Quote Requested» (pendiente de cotización / presupuesto).
-- Si quien pide adjunta el presupuesto, el cliente las pasa a «PO Requested».
-- El estado Pending se conserva para solicitudes antiguas y para el cambio manual.

CREATE OR REPLACE FUNCTION public.requests_start_as_quote_requested()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS NULL OR NEW.status = 'Pending' THEN
    NEW.status := 'Quote Requested';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS requests_skip_initial_approval ON public.requests;

CREATE TRIGGER requests_skip_initial_approval
  BEFORE INSERT ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.requests_start_as_quote_requested();
