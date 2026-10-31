-- Flujo de estados de una solicitud
-- =================================================================
-- Pendiente -> Presupuesto solicitado -> PO solicitado -> Pedido -> Recibido
-- (Denegada antes del PO, Cancelada con PO o pedido)
--
-- 1) Toda solicitud nueva empieza en "Pending". Había un trigger en la base,
--    requests_skip_initial_approval, que no estaba en el repo y la pasaba a
--    "Quote Requested" justo después de requests_estado_inicial. La app lo
--    deshacía con un segundo UPDATE, pero lo que entraba por otro camino
--    (Sofía) se quedaba en "Quote Requested" sin que nadie lo hubiera pedido.
DROP TRIGGER IF EXISTS requests_skip_initial_approval ON public.requests;
DROP FUNCTION IF EXISTS public.requests_start_as_quote_requested();

-- 2) Adjuntar el presupuesto o el PO hace avanzar la solicitud a
--    "PO Requested" (en pantalla: PO solicitado). Así el estado no se queda
--    en "Pendiente de presupuesto" con el presupuesto ya subido.
--    Solo actúa al rellenar un documento que estaba vacío, y solo desde
--    Pending o Quote Requested: no toca cambios de estado manuales.
CREATE OR REPLACE FUNCTION public.requests_avanza_con_documentos()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('Pending', 'Quote Requested')
     AND (
       (NEW.quote_url IS NOT NULL AND OLD.quote_url IS NULL)
       OR (NEW.po_number IS NOT NULL AND OLD.po_number IS NULL)
       OR (NEW.po_url IS NOT NULL AND OLD.po_url IS NULL)
     ) THEN
    NEW.status := 'PO Requested';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS requests_avanza_con_documentos ON public.requests;
CREATE TRIGGER requests_avanza_con_documentos
  BEFORE UPDATE OF quote_url, po_number, po_url ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.requests_avanza_con_documentos();

-- 3) "Quote Pending" no es un estado de la app: salía en inglés, sin botones
--    y fuera de todas las tarjetas del panel. Se quita de la base.
UPDATE public.requests SET status = 'Pending' WHERE status = 'Quote Pending';

ALTER TABLE public.requests ALTER COLUMN status SET DEFAULT 'Pending';

ALTER TABLE public.requests DROP CONSTRAINT IF EXISTS requests_status_check;
ALTER TABLE public.requests ADD CONSTRAINT requests_status_check
  CHECK (status IN ('Pending', 'Quote Requested', 'PO Requested', 'Ordered', 'Received', 'Denied', 'Cancelled'));

-- 4) Las que ya tienen presupuesto o PO pero siguen antes de "PO Requested"
UPDATE public.requests
   SET status = 'PO Requested'
 WHERE status IN ('Pending', 'Quote Requested')
   AND (quote_url IS NOT NULL OR po_number IS NOT NULL OR po_url IS NOT NULL);
