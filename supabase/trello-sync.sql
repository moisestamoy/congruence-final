-- Trello ↔ Congruence (supabase/functions/trello-sync). Las tarjetas del tablero Sales se copian a las
-- tareas de Congruence, y hecho / en proceso / pendiente se mantiene igual en los dos lados.
-- Quién avisa a la función:
--   · Trello, por webhook, cuando cambia algo del tablero (lo registra la propia función).
--   · Esta base, cuando cambia tasks_data de tu fila (trigger con pg_net).
--   · Un cron cada 5 minutos, por si algún aviso se pierde.
-- La función no confía en el aviso: siempre compara el tablero entero contra tus tareas.

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Lo último que se vio de cada par tarjeta–tarea. Con esto se sabe de qué lado cambió algo.
create table if not exists public.trello_sync (
  card_id    text primary key,
  task_id    text not null,
  estado     text not null,          -- pendiente | proceso | hecho
  nombre     text,
  updated_at timestamptz not null default now()
);
alter table public.trello_sync enable row level security;   -- sin políticas: solo la función (service role)

-- Una sola corrida a la vez; si llega otro aviso mientras corre, se marca y se vuelve a correr al terminar.
create table if not exists public.trello_sync_estado (
  id            int primary key default 1 check (id = 1),
  locked_until  timestamptz,
  pending       boolean not null default false,
  webhook_id    text
);
insert into public.trello_sync_estado (id) values (1) on conflict do nothing;
alter table public.trello_sync_estado enable row level security;

do $$ begin
  if not exists (select 1 from vault.secrets where name = 'trello_sync_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'trello_sync_secret', 'Clave interna de trello-sync (trigger, cron y URL del webhook)');
  end if;
end $$;

create or replace function public.trello_sync_secret() returns text
  language sql stable security definer set search_path to 'public' as $f$
  select decrypted_secret from vault.decrypted_secrets where name = 'trello_sync_secret'
$f$;

create or replace function public.trello_sync_lock() returns boolean
  language plpgsql security definer set search_path to 'public' as $f$
begin
  update trello_sync_estado set locked_until = now() + interval '90 seconds', pending = false
   where id = 1 and (locked_until is null or locked_until < now());
  if found then return true; end if;
  update trello_sync_estado set pending = true where id = 1;
  return false;
end $f$;

-- Suelta el candado; devuelve si llegó otro aviso mientras corría.
create or replace function public.trello_sync_unlock() returns boolean
  language plpgsql security definer set search_path to 'public' as $f$
declare otra boolean;
begin
  select pending into otra from trello_sync_estado where id = 1 for update;
  update trello_sync_estado set locked_until = null, pending = false where id = 1;
  return coalesce(otra, false);
end $f$;

-- Tus tareas y su huella, para escribir solo si nadie las cambió en el medio.
create or replace function public.trello_sync_read() returns jsonb
  language sql stable security definer set search_path to 'public' as $f$
  select jsonb_build_object('tasks', tasks_data, 'md5', md5(coalesce(tasks_data::text, '')))
    from user_data where id = 'c4e734ed-ffce-41bb-befd-4b9092a7ad51'
$f$;

-- No toca updated_at: las tareas van como en la app (SyncService, regla 6).
create or replace function public.trello_sync_write(p_tasks jsonb, p_md5 text) returns boolean
  language plpgsql security definer set search_path to 'public' as $f$
begin
  update user_data set tasks_data = p_tasks
   where id = 'c4e734ed-ffce-41bb-befd-4b9092a7ad51' and md5(coalesce(tasks_data::text, '')) = p_md5;
  return found;
end $f$;

revoke all on function public.trello_sync_secret(), public.trello_sync_lock(), public.trello_sync_unlock(),
  public.trello_sync_read(), public.trello_sync_write(jsonb, text) from public, anon, authenticated;
grant execute on function public.trello_sync_secret(), public.trello_sync_lock(), public.trello_sync_unlock(),
  public.trello_sync_read(), public.trello_sync_write(jsonb, text) to service_role;

-- Avisa a la función (sin esperar respuesta).
create or replace function public.trello_sync_ping() returns void
  language plpgsql security definer set search_path to 'public' as $f$
begin
  perform net.http_post(
    url := 'https://vbtshztpqlliytgbdjzm.supabase.co/functions/v1/trello-sync',
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-sync-secret', public.trello_sync_secret()));
end $f$;
revoke all on function public.trello_sync_ping() from public, anon, authenticated;

create or replace function public.trello_sync_on_tasks() returns trigger
  language plpgsql security definer set search_path to 'public' as $f$
begin
  -- Un aviso que falla nunca puede impedir que la app guarde tus tareas.
  begin
    perform public.trello_sync_ping();
  exception when others then
    raise warning 'trello-sync: no se pudo avisar (%)', sqlerrm;
  end;
  return null;
end $f$;

drop trigger if exists trello_sync_tasks on public.user_data;
create trigger trello_sync_tasks after update of tasks_data on public.user_data
  for each row when (new.id = 'c4e734ed-ffce-41bb-befd-4b9092a7ad51' and new.tasks_data is distinct from old.tasks_data)
  execute function public.trello_sync_on_tasks();

select cron.unschedule('trello-sync') where exists (select 1 from cron.job where jobname = 'trello-sync');
select cron.schedule('trello-sync', '*/5 * * * *', 'select public.trello_sync_ping()');
