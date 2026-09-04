-- Reception permissions for all authenticated users + optional inventory location.
-- Apply with: supabase db push  OR  run in Supabase SQL Editor.

-- 1) Optional storage location on inventory items
ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS location text;

-- 2) Packing slips: authenticated users can read/insert (receive packages)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'packing_slips'
      AND policyname = 'packing_slips_authenticated_select'
  ) THEN
    CREATE POLICY packing_slips_authenticated_select
      ON public.packing_slips FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'packing_slips'
      AND policyname = 'packing_slips_authenticated_insert'
  ) THEN
    CREATE POLICY packing_slips_authenticated_insert
      ON public.packing_slips FOR INSERT TO authenticated
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'packing_slips'
      AND policyname = 'packing_slips_authenticated_update'
  ) THEN
    CREATE POLICY packing_slips_authenticated_update
      ON public.packing_slips FOR UPDATE TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'packing_slips'
      AND policyname = 'packing_slips_authenticated_delete'
  ) THEN
    CREATE POLICY packing_slips_authenticated_delete
      ON public.packing_slips FOR DELETE TO authenticated
      USING (true);
  END IF;
END $$;

-- 3) Received items: authenticated users can read/insert/update/delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'received_items'
      AND policyname = 'received_items_authenticated_select'
  ) THEN
    CREATE POLICY received_items_authenticated_select
      ON public.received_items FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'received_items'
      AND policyname = 'received_items_authenticated_insert'
  ) THEN
    CREATE POLICY received_items_authenticated_insert
      ON public.received_items FOR INSERT TO authenticated
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'received_items'
      AND policyname = 'received_items_authenticated_update'
  ) THEN
    CREATE POLICY received_items_authenticated_update
      ON public.received_items FOR UPDATE TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'received_items'
      AND policyname = 'received_items_authenticated_delete'
  ) THEN
    CREATE POLICY received_items_authenticated_delete
      ON public.received_items FOR DELETE TO authenticated
      USING (true);
  END IF;
END $$;

-- 4) Inventory: authenticated users can update (e.g. location after receive)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'inventory'
      AND policyname = 'inventory_authenticated_select'
  ) THEN
    CREATE POLICY inventory_authenticated_select
      ON public.inventory FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'inventory'
      AND policyname = 'inventory_authenticated_update'
  ) THEN
    CREATE POLICY inventory_authenticated_update
      ON public.inventory FOR UPDATE TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 5) Allow marking requests as Received
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'requests'
      AND policyname = 'requests_authenticated_update'
  ) THEN
    CREATE POLICY requests_authenticated_update
      ON public.requests FOR UPDATE TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 6) Ensure RPCs used during reception are executable
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'add_or_update_inventory_item',
        'correct_received_item_quantity',
        'revert_request_reception'
      )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
