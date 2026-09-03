-- PakaPaka hardened Supabase setup.
-- The browser is allowed to read/add shared items and invoke validated RPCs.
-- Sensitive settings, scan tables and admin sessions are never directly exposed.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.pakapaka_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.pakapaka_scan_stats (
  id uuid primary key default gen_random_uuid(),
  department text not null,
  barcode text not null,
  name text,
  scan_count bigint not null default 0,
  last_scanned_at timestamptz not null default now(),
  unique (department, barcode)
);

create table if not exists public.pakapaka_devices (
  device_id text primary key,
  department text not null,
  total_scans bigint not null default 0,
  first_scan_at timestamptz not null default now(),
  last_scan_at timestamptz not null default now()
);

create table if not exists public.pakapaka_admin_sessions (
  token_hash text primary key,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table public."Pakatable" enable row level security;
alter table public.pakapaka_settings enable row level security;
alter table public.pakapaka_scan_stats enable row level security;
alter table public.pakapaka_devices enable row level security;
alter table public.pakapaka_admin_sessions enable row level security;

-- Sensitive tables: no direct browser access.
revoke all on public.pakapaka_settings from anon, authenticated;
revoke all on public.pakapaka_scan_stats from anon, authenticated;
revoke all on public.pakapaka_devices from anon, authenticated;
revoke all on public.pakapaka_admin_sessions from anon, authenticated;

-- Retire the unused legacy shared table if it still exists, without deleting data.
do $$
begin
  if to_regclass('public.pakapaka_items') is not null then
    execute 'alter table public.pakapaka_items enable row level security';
    execute 'drop policy if exists "Anyone can read pakapaka" on public.pakapaka_items';
    execute 'drop policy if exists "Anyone can insert pakapaka" on public.pakapaka_items';
    execute 'drop policy if exists "Anyone can delete pakapaka" on public.pakapaka_items';
    execute 'revoke all on public.pakapaka_items from anon, authenticated';
  end if;
end $$;

-- Shared list: least privilege, public read and validated insert only.
revoke all on public."Pakatable" from anon, authenticated;
grant select, insert on public."Pakatable" to anon, authenticated;
grant usage, select on sequence public."Pakatable_id_seq" to anon, authenticated;

drop policy if exists "Anyone can read Pakatable" on public."Pakatable";
drop policy if exists "Anyone can insert Pakatable" on public."Pakatable";
drop policy if exists "Anyone can delete Pakatable" on public."Pakatable";
drop policy if exists "Pakatable public read" on public."Pakatable";
drop policy if exists "Pakatable public insert" on public."Pakatable";

create policy "Pakatable public read"
on public."Pakatable" for select
to anon, authenticated
using (true);

create policy "Pakatable public insert"
on public."Pakatable" for insert
to anon, authenticated
with check (
  department ~ '^[0-9]{1,3}$'
  and length(btrim(coalesce(name, ''))) between 1 and 60
  and barcode ~ '^[0-9]{15}$'
  and length(coalesce(notes, '')) <= 250
);

-- Validated statistics writer. This is the only public path to scan/device tables.
create or replace function public.record_pakapaka_scan(
  p_device_id text,
  p_department text,
  p_barcode text,
  p_name text default ''
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  p_device_id := btrim(coalesce(p_device_id, ''));
  p_department := btrim(coalesce(p_department, ''));
  p_barcode := btrim(coalesce(p_barcode, ''));
  p_name := left(btrim(coalesce(p_name, '')), 200);

  if length(p_device_id) < 4 or length(p_device_id) > 200 then
    raise exception 'invalid device id';
  end if;
  if p_department <> 'ללא מחלקה' and p_department !~ '^[0-9]{1,3}$' then
    raise exception 'invalid department';
  end if;
  if p_barcode !~ '^[0-9]{15}$' then
    raise exception 'invalid barcode';
  end if;

  insert into public.pakapaka_scan_stats
    (department, barcode, name, scan_count, last_scanned_at)
  values (p_department, p_barcode, p_name, 1, now())
  on conflict (department, barcode) do update
  set name = excluded.name,
      scan_count = public.pakapaka_scan_stats.scan_count + 1,
      last_scanned_at = now();

  insert into public.pakapaka_devices
    (device_id, department, total_scans, first_scan_at, last_scan_at)
  values (p_device_id, p_department, 1, now(), now())
  on conflict (device_id) do update
  set department = excluded.department,
      total_scans = public.pakapaka_devices.total_scans + 1,
      last_scan_at = now();
end;
$$;

revoke execute on function public.record_pakapaka_scan(text,text,text,text) from public, authenticated;
grant execute on function public.record_pakapaka_scan(text,text,text,text) to anon;

-- Admin password must be stored as bcrypt under key admin_password_hash.
-- Do not store plaintext passwords in this file or in Git.

create or replace function public.pakapaka_admin_login(p_password text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hash text;
  v_token text;
begin
  delete from public.pakapaka_admin_sessions where expires_at <= now();

  if p_password is null or length(p_password) < 1 or length(p_password) > 128 then
    perform pg_sleep(0.5);
    return null;
  end if;

  select value into v_hash
  from public.pakapaka_settings
  where key = 'admin_password_hash'
  limit 1;

  if v_hash is null or extensions.crypt(p_password, v_hash) <> v_hash then
    perform pg_sleep(0.5);
    return null;
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.pakapaka_admin_sessions(token_hash, expires_at)
  values (encode(extensions.digest(v_token, 'sha256'), 'hex'), now() + interval '8 hours');
  return v_token;
end;
$$;

create or replace function public.pakapaka_admin_devices(p_token text)
returns table(device_id text, department text, total_scans bigint, last_scan_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_token is null or length(p_token) <> 64 or not exists (
    select 1 from public.pakapaka_admin_sessions s
    where s.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
      and s.expires_at > now()
  ) then
    raise exception 'invalid admin session' using errcode = '28000';
  end if;

  return query
  select d.device_id, d.department, d.total_scans, d.last_scan_at
  from public.pakapaka_devices d
  order by d.last_scan_at desc;
end;
$$;

create or replace function public.pakapaka_admin_logout(p_token text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_token is not null then
    delete from public.pakapaka_admin_sessions
    where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  end if;
end;
$$;

revoke execute on function public.pakapaka_admin_login(text) from public, authenticated;
revoke execute on function public.pakapaka_admin_devices(text) from public, authenticated;
revoke execute on function public.pakapaka_admin_logout(text) from public, authenticated;
grant execute on function public.pakapaka_admin_login(text) to anon;
grant execute on function public.pakapaka_admin_devices(text) to anon;
grant execute on function public.pakapaka_admin_logout(text) to anon;

-- Legacy auth-based admin helper is not part of the current application path.
revoke execute on function public.is_pakapaka_admin() from public, anon, authenticated;
