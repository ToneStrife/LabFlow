-- Vuelta atras de 20260920100000_request_events.sql

DROP TRIGGER IF EXISTS request_events_on_received_items ON public.received_items;
DROP TRIGGER IF EXISTS request_events_on_invoices ON public.invoices;
DROP TRIGGER IF EXISTS request_events_on_packing_slips ON public.packing_slips;
DROP TRIGGER IF EXISTS request_events_on_requests ON public.requests;

DROP FUNCTION IF EXISTS public.refresh_packing_slip_event_items();
DROP FUNCTION IF EXISTS public.log_invoice_event();
DROP FUNCTION IF EXISTS public.log_packing_slip_event();
DROP FUNCTION IF EXISTS public.log_request_row_event();
DROP FUNCTION IF EXISTS public.slip_items_payload(uuid);
DROP FUNCTION IF EXISTS public.request_event_actor(uuid);

DROP TABLE IF EXISTS public.request_events;
