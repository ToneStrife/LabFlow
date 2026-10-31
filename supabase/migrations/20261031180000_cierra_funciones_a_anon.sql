-- Las funciones SECURITY DEFINER se crean con EXECUTE para PUBLIC, así que
-- cualquiera con la clave anónima (que va en la web) podía llamarlas sin
-- iniciar sesión. Aquí se cierran las que solo usa la app con sesión.
--
-- Se quedan abiertas a anon, a propósito:
--   * las de los dispositivos SofIA que se autentican con su token o su
--     código de emparejamiento (sofia_config, sofia_pedir, sofia_pair_start…);
--   * las auxiliares de RLS (is_admin, has_permission, user_in_lab…), que
--     las políticas evalúan con el rol de quien consulta.

-- Acciones de la app: solo usuarios con sesión.
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.add_or_update_inventory_item(text, text, text, numeric, numeric, text, text)',
    'public.create_lab_with_sedes(text, text, text, text, jsonb, jsonb)',
    'public.create_request_with_items(uuid, uuid, text, uuid[], jsonb)',
    'public.create_request_with_items(uuid, uuid, uuid, uuid, text, uuid[], jsonb)',
    'public.destinatarios_aviso_solicitud(text)',
    'public.encolar_aviso_diario(uuid, uuid, text)',
    'public.revert_request_reception(uuid)',
    'public.sofia_pair_claim(text)',
    'public.sofia_secret_info(uuid)',
    'public.sofia_set_secrets(uuid, text, jsonb)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end $$;

-- Funciones de trigger: el trigger las ejecuta igualmente; nadie necesita
-- llamarlas directamente.
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.handle_new_user()',
    'public.log_invoice_event()',
    'public.log_packing_slip_event()',
    'public.log_request_row_event()',
    'public.protect_owner_on_delete()',
    'public.protect_owner_on_update()',
    'public.refresh_packing_slip_event_items()',
    'public.requests_fill_lab_sede()'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
  end loop;
end $$;
