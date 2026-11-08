-- Perfiles: ya no se puede uno hacer propietario ni cambiarse el rol por su cuenta.
--
-- El fallo: la política profiles_update deja a cada persona editar su propia
-- fila y authenticated tenía UPDATE sobre role e is_owner. Los triggers que
-- protegen al propietario empezaban con
--   IF current_user IN ('postgres','supabase_admin') THEN RETURN
-- pero son SECURITY DEFINER y su dueño es postgres, así que current_user
-- siempre era postgres, esa línea siempre se cumplía y el resto del trigger
-- era código muerto. Bastaba un PATCH a /rest/v1/profiles con
-- {"is_owner": true} para tener todos los permisos.
--
-- Arreglo, en dos capas:
--   1. Los triggers miran quién llama de verdad (session_user y el rol del
--      JWT), no el dueño de la función.
--   2. authenticated deja de poder escribir is_owner, email e id. La app nunca
--      escribe is_owner; el email lo ponía a mano quien quisiera quedarse con
--      el buzón de otro (smtp_accounts se reparte por el email del perfil).

-- 1. Triggers --------------------------------------------------------------
create or replace function public.protect_owner_on_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Conexiones de servicio: funciones Edge con la clave de servicio,
  -- migraciones y el editor SQL. session_user es quien se conectó, no el
  -- dueño de esta función.
  if auth.role() = 'service_role' or session_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if new.is_owner is distinct from old.is_owner and not public.am_i_owner() then
    raise exception 'Solo el propietario puede repartir o retirar esa marca';
  end if;

  if new.role is distinct from old.role then
    if not public.has_permission('users.manage') then
      raise exception 'No tienes permiso para cambiar roles';
    end if;
    if old.is_owner and (auth.uid() is null or auth.uid() <> old.id) then
      raise exception 'No se puede cambiar el rol del propietario';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.protect_owner_on_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Aquí no se exceptúa la clave de servicio: borrar al propietario por la
  -- función delete-user tampoco debe poder hacerse.
  if session_user in ('postgres', 'supabase_admin') then
    return old;
  end if;

  if old.is_owner and (auth.uid() is null or auth.uid() <> old.id) then
    raise exception 'No se puede borrar la cuenta del propietario';
  end if;

  return old;
end;
$$;

-- 2. Columnas escribibles -----------------------------------------------------
-- Se quita el UPDATE de toda la tabla y se devuelve columna a columna, sin
-- id, email ni is_owner. role sigue siendo escribible porque el panel de
-- usuarios lo cambia directamente; lo vigila el trigger de arriba.
do $$
declare
  columnas text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into columnas
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'profiles'
     and column_name not in ('id', 'email', 'is_owner');

  execute 'revoke update on public.profiles from anon, authenticated';
  execute format('grant update (%s) on public.profiles to authenticated', columnas);
end;
$$;
