-- Registro de actividad de solicitudes
-- =================================================================
-- Hasta ahora solo se guardaba el estado actual. No habia forma de
-- responder "cuando llego" o "que habia en el paquete" sin abrir cada
-- albaran. Esta tabla es el diario: altas, cambios de estado, llegadas
-- (con los productos) y facturas, fechadas y con quien lo hizo.
--
-- Los eventos los escriben triggers (el cliente no inserta a mano).
-- Lo antiguo se reconstruye lo que se puede: altas, albaranes (con
-- lineas recibidas) y facturas. Los cambios de estado anteriores a
-- este parche no se pueden inventar porque nadie los guardo.

CREATE TABLE public.request_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  request_id  uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  actor_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type  text NOT NULL,
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT request_events_type_check CHECK (event_type IN (
    'created',
    'status_changed',
    'quote_attached',
    'po_updated',
    'packing_slip',
    'invoice'
  ))
);

CREATE INDEX request_events_created_at_idx ON public.request_events (created_at DESC);
CREATE INDEX request_events_request_id_idx ON public.request_events (request_id, created_at DESC);
CREATE INDEX request_events_type_idx ON public.request_events (event_type);

COMMENT ON TABLE public.request_events IS
  'Diario de actividad de solicitudes: altas, estados, llegadas y facturas.';

ALTER TABLE public.request_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY request_events_select ON public.request_events
  FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.request_events TO authenticated;

-- ------------------------------------------------------------------
-- Actor: auth.uid() si existe en profiles; si no, el que nos pasen.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_event_actor(fallback uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT id FROM public.profiles WHERE id = auth.uid()),
    (SELECT id FROM public.profiles WHERE id = fallback)
  );
$$;

-- Lineas de un albaran, para saber QUE llego no solo que llego un paquete.
CREATE OR REPLACE FUNCTION public.slip_items_payload(p_slip_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'product_name', ri.product_name,
        'catalog_number', ri.catalog_number,
        'quantity', rec.quantity_received
      )
      ORDER BY ri.product_name
    ),
    '[]'::jsonb
  )
  FROM public.received_items rec
  JOIN public.request_items ri ON ri.id = rec.request_item_id
  WHERE rec.slip_id = p_slip_id;
$$;

-- ------------------------------------------------------------------
-- Solicitudes: alta, cambio de estado, cotizacion, PO
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_request_row_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.request_events (created_at, request_id, actor_id, event_type, payload)
    VALUES (
      COALESCE(NEW.created_at, now()),
      NEW.id,
      public.request_event_actor(NEW.requester_id),
      'created',
      jsonb_build_object(
        'request_number', NEW.request_number,
        'status', NEW.status
      )
    );
    RETURN NEW;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.request_events (request_id, actor_id, event_type, payload)
    VALUES (
      NEW.id,
      public.request_event_actor(NEW.requester_id),
      'status_changed',
      jsonb_build_object('from', OLD.status, 'to', NEW.status)
    );
  END IF;

  IF COALESCE(OLD.quote_url, '') IS DISTINCT FROM COALESCE(NEW.quote_url, '')
     AND NEW.quote_url IS NOT NULL AND NEW.quote_url <> '' THEN
    INSERT INTO public.request_events (request_id, actor_id, event_type, payload)
    VALUES (
      NEW.id,
      public.request_event_actor(),
      'quote_attached',
      jsonb_build_object('quote_url', NEW.quote_url)
    );
  END IF;

  IF COALESCE(OLD.po_url, '') IS DISTINCT FROM COALESCE(NEW.po_url, '')
     OR COALESCE(OLD.po_number, '') IS DISTINCT FROM COALESCE(NEW.po_number, '') THEN
    IF (NEW.po_url IS NOT NULL AND NEW.po_url <> '')
       OR (NEW.po_number IS NOT NULL AND NEW.po_number <> '') THEN
      INSERT INTO public.request_events (request_id, actor_id, event_type, payload)
      VALUES (
        NEW.id,
        public.request_event_actor(),
        'po_updated',
        jsonb_build_object(
          'po_number', NEW.po_number,
          'po_url', NEW.po_url
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER request_events_on_requests
  AFTER INSERT OR UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.log_request_row_event();

-- ------------------------------------------------------------------
-- Albaranes: primero el paquete, luego las lineas cuando se registran
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_packing_slip_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.request_events (created_at, request_id, actor_id, event_type, payload)
  VALUES (
    COALESCE(NEW.received_at, now()),
    NEW.request_id,
    public.request_event_actor(NEW.received_by),
    'packing_slip',
    jsonb_build_object(
      'slip_id', NEW.id,
      'slip_number', NEW.slip_number,
      'items', '[]'::jsonb
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER request_events_on_packing_slips
  AFTER INSERT ON public.packing_slips
  FOR EACH ROW
  EXECUTE FUNCTION public.log_packing_slip_event();

CREATE OR REPLACE FUNCTION public.refresh_packing_slip_event_items()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.request_events
  SET payload = jsonb_set(
    payload,
    '{items}',
    public.slip_items_payload(NEW.slip_id)
  )
  WHERE event_type = 'packing_slip'
    AND payload->>'slip_id' = NEW.slip_id::text;
  RETURN NEW;
END;
$$;

CREATE TRIGGER request_events_on_received_items
  AFTER INSERT ON public.received_items
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_packing_slip_event_items();

-- ------------------------------------------------------------------
-- Facturas
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_invoice_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.request_events (created_at, request_id, actor_id, event_type, payload)
  VALUES (
    COALESCE(NEW.invoiced_at, now()),
    NEW.request_id,
    public.request_event_actor(NEW.invoiced_by),
    'invoice',
    jsonb_build_object(
      'invoice_id', NEW.id,
      'invoice_number', NEW.invoice_number
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER request_events_on_invoices
  AFTER INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.log_invoice_event();

-- ------------------------------------------------------------------
-- Backfill de lo que si se puede reconstruir
-- ------------------------------------------------------------------
INSERT INTO public.request_events (created_at, request_id, actor_id, event_type, payload)
SELECT
  r.created_at,
  r.id,
  p.id,
  'created',
  jsonb_build_object(
    'request_number', r.request_number,
    'status', r.status
  )
FROM public.requests r
LEFT JOIN public.profiles p ON p.id = r.requester_id;

INSERT INTO public.request_events (created_at, request_id, actor_id, event_type, payload)
SELECT
  COALESCE(s.received_at, now()),
  s.request_id,
  p.id,
  'packing_slip',
  jsonb_build_object(
    'slip_id', s.id,
    'slip_number', s.slip_number,
    'items', public.slip_items_payload(s.id)
  )
FROM public.packing_slips s
LEFT JOIN public.profiles p ON p.id = s.received_by;

INSERT INTO public.request_events (created_at, request_id, actor_id, event_type, payload)
SELECT
  COALESCE(i.invoiced_at, now()),
  i.request_id,
  p.id,
  'invoice',
  jsonb_build_object(
    'invoice_id', i.id,
    'invoice_number', i.invoice_number
  )
FROM public.invoices i
LEFT JOIN public.profiles p ON p.id = i.invoiced_by;
