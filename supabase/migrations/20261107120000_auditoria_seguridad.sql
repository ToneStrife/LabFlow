-- Auditoría de seguridad (noviembre 2026). Cinco cosas:
--   1. Archivos del bucket LabFlow: antes cualquier persona con sesión podía
--      leer, sobrescribir y borrar cualquier archivo (ocho políticas solapadas).
--   2. La contraseña SMTP ya no se puede leer por la API: solo la función de
--      envío, con la clave de servicio.
--   3. Artículos, historial y registro de correos se leen solo si la solicitud
--      es visible; antes se leían todos, aunque fueran de otro laboratorio.
--   4. Quien pidió solo borra su solicitud antes de que esté pedida.
--   5. search_path fijo en las funciones que no lo tenían, y las funciones de
--      permisos dejan de ser ejecutables sin sesión.

-- 1. Archivos ----------------------------------------------------------------
-- Ruta de los archivos: <solicitante>/<solicitud>/<tipo>/<nombre>.
drop policy if exists "Allow authenticated deletes from LabFlow" on storage.objects;
drop policy if exists "Allow authenticated reads from LabFlow" on storage.objects;
drop policy if exists "Allow authenticated updates to LabFlow" on storage.objects;
drop policy if exists "Allow authenticated uploads to LabFlow" on storage.objects;
drop policy if exists "Allow authenticated users to access their own files" on storage.objects;
drop policy if exists "Allow authenticated users to download files via signed URL" on storage.objects;
drop policy if exists "Allow authenticated users to read their own files" on storage.objects;
drop policy if exists "Allow authenticated users to upload files" on storage.objects;
drop policy if exists "Allow authenticated users to view files" on storage.objects;

-- Lee quien ve documentos o quien puede ver la solicitud a la que pertenece
-- el archivo (la RLS de requests decide eso).
create policy labflow_objects_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'LabFlow'
    and (
      public.has_permission('documents.view')
      or exists (
        select 1 from public.requests r
        where r.id::text = split_part(name, '/', 2)
      )
    )
  );

-- Las subidas van por la función upload-file (clave de servicio) o por una
-- URL firmada que ella misma crea; esta política queda por si algún día se
-- sube directo con sesión.
create policy labflow_objects_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'LabFlow');

create policy labflow_objects_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'LabFlow'
    and (public.has_permission('reception.receive') or public.has_permission('requests.edit_any'))
  )
  with check (
    bucket_id = 'LabFlow'
    and (public.has_permission('reception.receive') or public.has_permission('requests.edit_any'))
  );

create policy labflow_objects_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'LabFlow'
    and (public.has_permission('reception.receive') or public.has_permission('requests.edit_any'))
  );

-- 2. Contraseña SMTP ---------------------------------------------------------
-- La app pide las columnas por su nombre y nunca smtp_password; la función
-- send-email la lee con la clave de servicio, a la que esto no afecta.
revoke select on public.smtp_accounts from authenticated, anon;
grant select (id, email, smtp_host, smtp_user, label, updated_at, updated_by, has_password)
  on public.smtp_accounts to authenticated;

-- 3. Lecturas ligadas a la solicitud ------------------------------------------
drop policy if exists request_items_select on public.request_items;
create policy request_items_select on public.request_items
  for select to authenticated
  using (exists (select 1 from public.requests r where r.id = request_items.request_id));

drop policy if exists request_events_select on public.request_events;
create policy request_events_select on public.request_events
  for select to authenticated
  using (exists (select 1 from public.requests r where r.id = request_events.request_id));

-- El registro de correos lo ve quien gestiona plantillas (es la pestaña de
-- Admin que lo muestra) y cada cual los suyos.
drop policy if exists email_logs_select on public.email_logs;
create policy email_logs_select on public.email_logs
  for select to authenticated
  using (public.has_permission('email_templates.manage') or sent_by = auth.uid());

-- 4. Borrar la propia solicitud ---------------------------------------------
-- Una vez pedida o recibida ya hay albaranes, facturas e inventario colgando
-- de ella; borrarla queda para quien tiene requests.delete_any.
drop policy if exists requests_delete on public.requests;
create policy requests_delete on public.requests
  for delete to authenticated
  using (
    public.has_permission('requests.delete_any')
    or (
      requester_id = auth.uid()
      and status in ('Pending', 'Quote Requested', 'PO Requested', 'Denied', 'Cancelled')
    )
  );

-- 5. search_path y funciones sin sesión -------------------------------------
alter function public.correct_received_item_quantity(uuid, integer) set search_path = public, extensions;
alter function public.create_request_with_items(uuid, uuid, text, uuid[], jsonb) set search_path = public, extensions;
alter function public.create_request_with_items(uuid, uuid, uuid, uuid, text, uuid[], jsonb) set search_path = public, extensions;
alter function public.generate_request_number() set search_path = public, extensions;
alter function public.request_event_actor(uuid) set search_path = public, extensions;
alter function public.requests_estado_inicial() set search_path = public, extensions;
alter function public.requests_estado_inicial_upd() set search_path = public, extensions;
alter function public.revert_request_reception(uuid) set search_path = public, extensions;
alter function public.search_inventory(text) set search_path = public, extensions;
alter function public.search_request_items(text) set search_path = public, extensions;
alter function public.slip_items_payload(uuid) set search_path = public, extensions;
alter function public.sofia_devices_bump_rev() set search_path = public, extensions;
alter function public.sofia_firmware_publicado_at() set search_path = public, extensions;
alter function public.sofia_norm(text) set search_path = public, extensions;
alter function public.sofia_rasgos(text) set search_path = public, extensions;
alter function public.sofia_sinonimos(text) set search_path = public, extensions;
alter function public.sofia_tokens(text) set search_path = public, extensions;
alter function public.update_last_used_timestamp() set search_path = public, extensions;

-- Sin sesión estas devuelven falso o nada, pero no tienen por qué estar
-- expuestas. Las sofia_* con token siguen abiertas: la placa entra con la
-- clave pública. El EXECUTE viene del pseudorrol PUBLIC (toda función lo trae
-- de serie), así que hay que quitarlo de ahí y volver a darlo a quien toca.
revoke execute on function
  public.am_i_owner(),
  public.has_permission(text),
  public.is_admin(),
  public.is_lab_manager(uuid),
  public.is_owner_row(uuid),
  public.my_permissions(),
  public.sede_lab_id(text),
  public.user_in_lab(uuid),
  public.user_lab_role(uuid),
  public.correct_received_item_quantity(uuid, integer),
  public.generate_request_number(),
  public.request_event_actor(uuid),
  public.search_inventory(text),
  public.search_request_items(text),
  public.slip_items_payload(uuid)
from public, anon;

grant execute on function
  public.am_i_owner(),
  public.has_permission(text),
  public.is_admin(),
  public.is_lab_manager(uuid),
  public.is_owner_row(uuid),
  public.my_permissions(),
  public.sede_lab_id(text),
  public.user_in_lab(uuid),
  public.user_lab_role(uuid),
  public.correct_received_item_quantity(uuid, integer),
  public.generate_request_number(),
  public.request_event_actor(uuid),
  public.search_inventory(text),
  public.search_request_items(text),
  public.slip_items_payload(uuid)
to authenticated, service_role;
