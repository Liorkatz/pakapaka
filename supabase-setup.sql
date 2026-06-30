-- Pakapaka admin + scan stats setup
-- Run this once in Supabase SQL Editor.
-- Do not commit your real admin password into GitHub.

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

alter table public.pakapaka_settings enable row level security;
alter table public.pakapaka_scan_stats enable row level security;

drop policy if exists "pakapaka settings read" on public.pakapaka_settings;
create policy "pakapaka settings read"
on public.pakapaka_settings
for select
to anon
using (true);

drop policy if exists "pakapaka scan stats read" on public.pakapaka_scan_stats;
create policy "pakapaka scan stats read"
on public.pakapaka_scan_stats
for select
to anon
using (true);

drop policy if exists "pakapaka scan stats insert" on public.pakapaka_scan_stats;
create policy "pakapaka scan stats insert"
on public.pakapaka_scan_stats
for insert
to anon
with check (true);

drop policy if exists "pakapaka scan stats update" on public.pakapaka_scan_stats;
create policy "pakapaka scan stats update"
on public.pakapaka_scan_stats
for update
to anon
using (true)
with check (true);

-- Insert the admin password manually in Supabase, not in GitHub:
-- insert into public.pakapaka_settings (key, value)
-- values ('admin_password', 'PUT_PASSWORD_HERE')
-- on conflict (key) do update set value = excluded.value, updated_at = now();
