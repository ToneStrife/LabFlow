-- Integridad de la recepción de pedidos, el inventario y las líneas de solicitud.
--
-- Lo que arregla (revisión completa del 8 nov 2026):
--   1. La recepción eran cuatro llamadas sueltas desde el navegador (albarán,
--      líneas, inventario, estado). Si fallaba una a medias y se reintentaba,
--      se duplicaba lo recibido y el inventario; y el tope de lo pedido solo
--      se comprobaba en el cliente, así que dos personas a la vez lo pasaban.
--      Ahora es una sola función (receive_items), atómica, que bloquea la
--      solicitud y valida el tope.
--   2. Borrar el albarán de una recepción parcial no descontaba el inventario.
--      Ahora lo hace delete_packing_slip.
--   3. Corregir una cantidad recibida no validaba el total ni recalculaba el
--      estado de la solicitud.
--   4. Revertir/corregir buscaban la fila de inventario solo por catálogo y
--      marca, sin la sede, y podían tocar la de otra sede. Ahora usan la misma
--      clave que la recepción (producto + catálogo + sede). Además
--      revert_request_reception no comprobaba ningún permiso.
--   5. Quitar un artículo que ya tenía recepciones o facturas las borraba por
--      cascada, dejando el inventario sin respaldo.
--   6. Dos primeras recepciones a la vez del mismo producto podían crear dos
--      filas de inventario.

-- Ayudantes internos (solo los llaman las funciones de abajo) -----------------
create or replace function public._solicitud_visible(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Mismo criterio que la política requests_select.
  select exists (
    select 1 from public.requests r
     where r.id = p_id
       and (
         public.am_i_owner()
         or public.is_admin()
         or r.requester_id = auth.uid()
         or (r.lab_id is not null and public.user_in_lab(r.lab_id))
       )
  );
$$;

create or replace function public._solicitud_completa(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(bool_and(coalesce(r.total, 0) >= i.quantity), false)
    from public.request_items i
    left join (
      select request_item_id, sum(quantity_received) as total
        from public.received_items
       group by request_item_id
    ) r on r.request_item_id = i.id
   where i.request_id = p_id;
$$;

-- La fila de inventario que corresponde a un artículo: la de su sede y, si esa
-- no existe (recepciones antiguas, apuntadas a otra sede), la única fila con
-- ese producto y catálogo. Si hay varias y ninguna es de la sede, no adivina.
create or replace function public._fila_inventario(p_producto text, p_catalogo text, p_sede text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select id from public.inventory
      where product_name = p_producto
        and catalog_number = p_catalogo
        and sede_id is not distinct from p_sede
      limit 1),
    (select id from public.inventory
      where product_name = p_producto
        and catalog_number = p_catalogo
        and (select count(*) from public.inventory i2
              where i2.product_name = p_producto and i2.catalog_number = p_catalogo) = 1)
  );
$$;

revoke execute on function public._solicitud_visible(uuid) from public, anon, authenticated;
revoke execute on function public._solicitud_completa(uuid) from public, anon, authenticated;
revoke execute on function public._fila_inventario(text, text, text) from public, anon, authenticated;

-- 6. Inventario: una fila por producto y sede -------------------------------------
create unique index if not exists inventory_producto_sede_uniq
  on public.inventory (product_name, catalog_number, (coalesce(sede_id, '')));

create or replace function public.add_or_update_inventory_item(
  product_name_in text,
  catalog_number_in text,
  brand_in text default null,
  quantity_in numeric default 0,
  unit_price_in numeric default null,
  format_in text default null,
  sede_id_in text default null
)
returns public.inventory
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.inventory;
begin
  loop
    select * into row
      from public.inventory
     where product_name = product_name_in
       and catalog_number = catalog_number_in
       and sede_id is not distinct from sede_id_in
       for update;

    if found then
      update public.inventory set
        quantity = quantity + quantity_in,
        brand = coalesce(brand_in, brand),
        unit_price = coalesce(unit_price_in, unit_price),
        format = coalesce(format_in, format),
        last_updated = now()
      where id = row.id
      returning * into row;
      return row;
    end if;

    begin
      insert into public.inventory (
        product_name, catalog_number, brand, quantity, unit_price, format, sede_id
      ) values (
        product_name_in, catalog_number_in, brand_in, quantity_in, unit_price_in, format_in, sede_id_in
      )
      returning * into row;
      return row;
    exception when unique_violation then
      -- Otra recepción creó la fila a la vez: se vuelve a intentar sumando.
      null;
    end;
  end loop;
end;
$$;

-- 1. Recepción atómica --------------------------------------------------------
-- p_items: [{ "request_item_id": uuid, "quantity_received": n, "storage_location": text|null }]
create or replace function public.receive_items(
  p_request_id uuid,
  p_slip_number text,
  p_slip_url text,
  p_sede_id text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_status text;
  v_sede text;
  v_addr uuid;
  v_slip public.packing_slips;
  v_item jsonb;
  v_ri public.request_items;
  v_qty integer;
  v_prev integer;
  v_loc text;
  v_num text;
  v_completa boolean;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para recibir artículos.';
  end if;
  if not public.has_permission('reception.receive') then
    raise exception 'No tienes permiso para recibir artículos.';
  end if;
  if not public._solicitud_visible(p_request_id) then
    raise exception 'Solicitud no encontrada.';
  end if;

  -- Bloquea la solicitud: dos recepciones a la vez se turnan.
  select status::text, sede_id, shipping_address_id
    into v_status, v_sede, v_addr
    from public.requests
   where id = p_request_id
     for update;

  if v_status not in ('Ordered', 'Received') then
    raise exception 'Solo se puede recibir una solicitud ya pedida (estado actual: %).', v_status;
  end if;

  if v_sede is null and v_addr is not null then
    select sede_id into v_sede from public.shipping_addresses where id = v_addr;
  end if;
  v_sede := coalesce(v_sede, nullif(trim(p_sede_id), ''));

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'No hay artículos que recibir.';
  end if;

  v_num := coalesce(
    nullif(trim(p_slip_number), ''),
    'SLIP-' || (extract(epoch from clock_timestamp()) * 1000)::bigint
  );

  begin
    insert into public.packing_slips (request_id, slip_number, received_by, slip_url)
    values (p_request_id, v_num, auth.uid(), nullif(p_slip_url, ''))
    returning * into v_slip;
  exception when unique_violation then
    raise exception 'Ya hay un albarán con el número "%" en esta solicitud.', v_num;
  end;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity_received')::integer;
    v_loc := nullif(trim(coalesce(v_item ->> 'storage_location', '')), '');

    if v_qty is null or v_qty < 0 then
      raise exception 'Cantidad recibida no válida.';
    end if;

    select * into v_ri
      from public.request_items
     where id = (v_item ->> 'request_item_id')::uuid
       and request_id = p_request_id;
    if not found then
      raise exception 'Un artículo no pertenece a esta solicitud.';
    end if;

    select coalesce(sum(quantity_received), 0) into v_prev
      from public.received_items
     where request_item_id = v_ri.id;

    if v_prev + v_qty > v_ri.quantity then
      raise exception 'No se pueden recibir % de "%": se pidieron % y ya hay % recibidas.',
        v_qty, v_ri.product_name, v_ri.quantity, v_prev;
    end if;

    insert into public.received_items (slip_id, request_item_id, quantity_received)
    values (v_slip.id, v_ri.id, v_qty);

    if v_qty > 0 then
      perform public.add_or_update_inventory_item(
        v_ri.product_name, v_ri.catalog_number, v_ri.brand, v_qty,
        v_ri.unit_price, v_ri.format, v_sede
      );
      if v_loc is not null then
        update public.inventory
           set location = v_loc
         where product_name = v_ri.product_name
           and catalog_number = v_ri.catalog_number
           and sede_id is not distinct from v_sede;
      end if;
    end if;
  end loop;

  if nullif(p_slip_url, '') is not null then
    update public.requests set slip_url = p_slip_url where id = p_request_id;
  end if;

  v_completa := public._solicitud_completa(p_request_id);
  if v_completa and v_status <> 'Received' then
    update public.requests set status = 'Received' where id = p_request_id;
  end if;

  return jsonb_build_object(
    'id', v_slip.id,
    'request_id', p_request_id,
    'slip_number', v_slip.slip_number,
    'completa', v_completa
  );
end;
$$;

-- 3 y 4. Corregir la cantidad de una línea recibida -----------------------------
create or replace function public.correct_received_item_quantity(
  received_item_id_in uuid,
  new_quantity_in integer
)
returns setof public.received_items
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_req uuid;
  v_ri public.received_items;
  v_it public.request_items;
  v_status text;
  v_sede text;
  v_addr uuid;
  v_total integer;
  v_dif integer;
  v_inv uuid;
  v_completa boolean;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.';
  end if;
  if not public.has_permission('reception.receive') then
    raise exception 'No tienes permiso para corregir recepciones.';
  end if;
  if new_quantity_in is null or new_quantity_in < 0 then
    raise exception 'La cantidad no puede ser negativa.';
  end if;

  select ps.request_id into v_req
    from public.received_items ri
    join public.packing_slips ps on ps.id = ri.slip_id
   where ri.id = received_item_id_in;
  if v_req is null then
    raise exception 'Línea recibida no encontrada.';
  end if;
  if not public._solicitud_visible(v_req) then
    raise exception 'Solicitud no encontrada.';
  end if;

  select status::text, sede_id, shipping_address_id
    into v_status, v_sede, v_addr
    from public.requests
   where id = v_req
     for update;

  select * into v_ri from public.received_items where id = received_item_id_in;
  select * into v_it from public.request_items where id = v_ri.request_item_id;

  select coalesce(sum(quantity_received), 0) - v_ri.quantity_received + new_quantity_in
    into v_total
    from public.received_items
   where request_item_id = v_ri.request_item_id;

  if v_total > v_it.quantity then
    raise exception 'La cantidad total recibida (%) no puede superar la pedida (%).', v_total, v_it.quantity;
  end if;

  v_dif := new_quantity_in - v_ri.quantity_received;
  if v_dif = 0 then
    return query select * from public.received_items where id = received_item_id_in;
    return;
  end if;

  update public.received_items
     set quantity_received = new_quantity_in
   where id = received_item_id_in;

  if v_sede is null and v_addr is not null then
    select sede_id into v_sede from public.shipping_addresses where id = v_addr;
  end if;

  v_inv := public._fila_inventario(v_it.product_name, v_it.catalog_number, v_sede);
  if v_inv is not null then
    update public.inventory
       set quantity = greatest(0, quantity + v_dif),
           last_updated = now()
     where id = v_inv;
  elsif v_dif > 0 then
    perform public.add_or_update_inventory_item(
      v_it.product_name, v_it.catalog_number, v_it.brand, v_dif,
      v_it.unit_price, v_it.format, v_sede
    );
  else
    raise warning 'No se encontró la fila de inventario de % (%) al corregir; no se ajustó.',
      v_it.product_name, v_it.catalog_number;
  end if;

  v_completa := public._solicitud_completa(v_req);
  if v_completa and v_status <> 'Received' then
    update public.requests set status = 'Received' where id = v_req;
  elsif not v_completa and v_status = 'Received' then
    update public.requests set status = 'Ordered' where id = v_req;
  end if;

  return query select * from public.received_items where id = received_item_id_in;
end;
$$;

-- 2. Borrar un albarán --------------------------------------------------------
create or replace function public.delete_packing_slip(p_slip_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_req uuid;
  v_url text;
  v_status text;
  v_sede text;
  v_addr uuid;
  v_linea record;
  v_inv uuid;
  v_tiene_lineas boolean;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.';
  end if;
  if not public.has_permission('reception.receive') then
    raise exception 'No tienes permiso para eliminar albaranes.';
  end if;

  select request_id, slip_url into v_req, v_url
    from public.packing_slips where id = p_slip_id;
  if v_req is null then
    raise exception 'Albarán no encontrado.';
  end if;
  if not public._solicitud_visible(v_req) then
    raise exception 'Solicitud no encontrada.';
  end if;

  select status::text, sede_id, shipping_address_id
    into v_status, v_sede, v_addr
    from public.requests
   where id = v_req
     for update;

  select exists (select 1 from public.received_items where slip_id = p_slip_id)
    into v_tiene_lineas;

  if v_status = 'Received' and v_tiene_lineas then
    raise exception 'No se puede eliminar el albarán: la solicitud está recibida y tiene artículos asociados. Usa «Revertir recepción».';
  end if;

  if v_sede is null and v_addr is not null then
    select sede_id into v_sede from public.shipping_addresses where id = v_addr;
  end if;

  -- Lo que este albarán sumó al inventario se descuenta.
  for v_linea in
    select ri.quantity_received, it.product_name, it.catalog_number
      from public.received_items ri
      join public.request_items it on it.id = ri.request_item_id
     where ri.slip_id = p_slip_id
       and ri.quantity_received > 0
  loop
    v_inv := public._fila_inventario(v_linea.product_name, v_linea.catalog_number, v_sede);
    if v_inv is not null then
      update public.inventory
         set quantity = greatest(0, quantity - v_linea.quantity_received),
             last_updated = now()
       where id = v_inv;
    else
      raise warning 'No se encontró la fila de inventario de % (%) al borrar el albarán; no se ajustó.',
        v_linea.product_name, v_linea.catalog_number;
    end if;
  end loop;

  delete from public.received_items where slip_id = p_slip_id;
  delete from public.packing_slips where id = p_slip_id;

  return jsonb_build_object('request_id', v_req, 'slip_url', v_url);
end;
$$;

-- 4. Revertir la recepción completa -------------------------------------------
create or replace function public.revert_request_reception(request_id_in uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_linea record;
  v_inv uuid;
  v_status text;
  v_sede text;
  v_addr uuid;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.';
  end if;
  -- Antes no se comprobaba nada: cualquier usuario con sesión podía revertir.
  if not public.has_permission('requests.override_status') then
    raise exception 'No tienes permiso para revertir una recepción.';
  end if;
  if not public._solicitud_visible(request_id_in) then
    raise exception 'Solicitud no encontrada.';
  end if;

  select status::text, sede_id, shipping_address_id
    into v_status, v_sede, v_addr
    from public.requests
   where id = request_id_in
     for update;

  if v_status <> 'Received' then
    raise exception 'No se puede revertir: la solicitud está en estado %.', v_status;
  end if;

  if v_sede is null and v_addr is not null then
    select sede_id into v_sede from public.shipping_addresses where id = v_addr;
  end if;

  for v_linea in
    select ri.quantity_received, it.product_name, it.catalog_number
      from public.received_items ri
      join public.packing_slips ps on ps.id = ri.slip_id
      join public.request_items it on it.id = ri.request_item_id
     where ps.request_id = request_id_in
       and ri.quantity_received > 0
  loop
    v_inv := public._fila_inventario(v_linea.product_name, v_linea.catalog_number, v_sede);
    if v_inv is not null then
      update public.inventory
         set quantity = greatest(0, quantity - v_linea.quantity_received),
             last_updated = now()
       where id = v_inv;
    else
      raise warning 'No se encontró la fila de inventario de % (%) al revertir; no se ajustó.',
        v_linea.product_name, v_linea.catalog_number;
    end if;
  end loop;

  delete from public.received_items
   where slip_id in (select id from public.packing_slips where request_id = request_id_in);
  delete from public.packing_slips where request_id = request_id_in;

  update public.requests set status = 'Ordered' where id = request_id_in;
end;
$$;

-- 5. Artículos con historial -----------------------------------------------------
create or replace function public.request_items_proteger_historial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recibido integer;
  v_facturado integer;
begin
  if tg_op = 'DELETE' then
    -- Borrado en cascada al borrar la solicitud entera: se deja pasar.
    if pg_trigger_depth() > 1 then
      return old;
    end if;
    if exists (select 1 from public.received_items where request_item_id = old.id)
       or exists (select 1 from public.invoiced_items where request_item_id = old.id) then
      raise exception 'No se puede quitar un artículo que ya tiene recepciones o facturas. Revierte antes la recepción.';
    end if;
    return old;
  end if;

  -- UPDATE de la cantidad: no puede bajar de lo ya recibido ni facturado.
  select coalesce(sum(quantity_received), 0) into v_recibido
    from public.received_items where request_item_id = new.id;
  select coalesce(sum(quantity_invoiced), 0) into v_facturado
    from public.invoiced_items where request_item_id = new.id;

  if new.quantity < v_recibido or new.quantity < v_facturado then
    raise exception 'La cantidad no puede ser menor que la ya recibida (%) ni que la facturada (%).',
      v_recibido, v_facturado;
  end if;
  return new;
end;
$$;

revoke execute on function public.request_items_proteger_historial() from public, anon, authenticated;

drop trigger if exists trg_request_items_historial_del on public.request_items;
create trigger trg_request_items_historial_del
  before delete on public.request_items
  for each row execute function public.request_items_proteger_historial();

drop trigger if exists trg_request_items_historial_upd on public.request_items;
create trigger trg_request_items_historial_upd
  before update of quantity on public.request_items
  for each row execute function public.request_items_proteger_historial();

-- Permisos de las funciones que llama la app ------------------------------------
revoke execute on function public.receive_items(uuid, text, text, text, jsonb) from public, anon;
grant execute on function public.receive_items(uuid, text, text, text, jsonb) to authenticated;
revoke execute on function public.delete_packing_slip(uuid) from public, anon;
grant execute on function public.delete_packing_slip(uuid) to authenticated;
revoke execute on function public.correct_received_item_quantity(uuid, integer) from public, anon;
grant execute on function public.correct_received_item_quantity(uuid, integer) to authenticated;
revoke execute on function public.revert_request_reception(uuid) from public, anon;
grant execute on function public.revert_request_reception(uuid) to authenticated;
revoke execute on function public.add_or_update_inventory_item(text, text, text, numeric, numeric, text, text) from public, anon;
grant execute on function public.add_or_update_inventory_item(text, text, text, numeric, numeric, text, text) to authenticated;
