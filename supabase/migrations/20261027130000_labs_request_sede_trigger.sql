-- Rellenar lab_id / sede_id en requests al crear o cambiar dirección de envío.
-- La recepción de inventario siempre debe persistir sede_id (ya vía RPC con sede_id_in).

CREATE OR REPLACE FUNCTION public.requests_fill_lab_sede()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sede text;
  v_lab uuid;
BEGIN
  -- Preferir sede explícita; si no, la de la dirección de envío
  v_sede := NEW.sede_id;
  IF v_sede IS NULL AND NEW.shipping_address_id IS NOT NULL THEN
    SELECT a.sede_id INTO v_sede
    FROM public.shipping_addresses a
    WHERE a.id = NEW.shipping_address_id;
  END IF;

  IF v_sede IS NOT NULL THEN
    NEW.sede_id := v_sede;
    SELECT s.lab_id INTO v_lab FROM public.sedes s WHERE s.id = v_sede LIMIT 1;
    IF v_lab IS NOT NULL THEN
      NEW.lab_id := v_lab;
    END IF;
  END IF;

  -- Fallback FarBioQ si aún no hay lab
  IF NEW.lab_id IS NULL THEN
    NEW.lab_id := 'a0000000-0000-4000-8000-000000000001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS requests_fill_lab_sede_trg ON public.requests;
CREATE TRIGGER requests_fill_lab_sede_trg
  BEFORE INSERT OR UPDATE OF shipping_address_id, sede_id
  ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.requests_fill_lab_sede();

-- Projects sin lab → FarBioQ (idempotente)
UPDATE public.projects
SET lab_id = 'a0000000-0000-4000-8000-000000000001'
WHERE lab_id IS NULL;

NOTIFY pgrst, 'reload schema';
