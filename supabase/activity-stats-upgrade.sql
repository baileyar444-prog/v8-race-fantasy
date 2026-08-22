-- V8 Race Fantasy activity statistics upgrade.
-- Run this once in Supabase SQL Editor before/after deploying the website update.
--
-- Adds:
-- - profiles.last_seen_at for each account's latest activity
-- - user_activity_days for unique accounts online per day
-- - mark_user_activity() RPC used by the website heartbeat

create extension if not exists pgcrypto;

alter table public.profiles
add column if not exists last_seen_at timestamptz;

-- Keep the admin helper locked to role = admin.
create or replace function public.is_creator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;

create table if not exists public.user_activity_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  heartbeat_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, activity_date)
);

alter table public.user_activity_days enable row level security;

create index if not exists user_activity_days_date_idx
on public.user_activity_days(activity_date desc);

create index if not exists user_activity_days_user_date_idx
on public.user_activity_days(user_id, activity_date desc);

create index if not exists profiles_last_seen_at_idx
on public.profiles(last_seen_at desc);

-- Users can read their own activity. Admin can read all activity.
drop policy if exists "users can read own activity days" on public.user_activity_days;
create policy "users can read own activity days"
on public.user_activity_days
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "admins can read all activity days" on public.user_activity_days;
create policy "admins can read all activity days"
on public.user_activity_days
for select
to authenticated
using (public.is_creator());

-- Users can insert/update their own daily activity rows.
-- The RPC below is the main path, but these policies also keep direct client upserts safe.
drop policy if exists "users can insert own activity days" on public.user_activity_days;
create policy "users can insert own activity days"
on public.user_activity_days
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can update own activity days" on public.user_activity_days;
create policy "users can update own activity days"
on public.user_activity_days
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Let logged-in users update their own last_seen_at heartbeat on profiles.
drop policy if exists "users can update own activity heartbeat" on public.profiles;
create policy "users can update own activity heartbeat"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Make sure admin stats can read profiles, including last_seen_at.
drop policy if exists "admins can read all profiles for stats" on public.profiles;
create policy "admins can read all profiles for stats"
on public.profiles
for select
to authenticated
using (public.is_creator());

-- The website calls this every 45 seconds while a logged-in user is active.
-- Dates are counted using Brisbane/AEST day boundaries.
create or replace function public.mark_user_activity()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  now_ts timestamptz := now();
  brisbane_day date := (now() at time zone 'Australia/Brisbane')::date;
begin
  if current_user_id is null then
    return;
  end if;

  update public.profiles
  set last_seen_at = now_ts
  where id = current_user_id;

  insert into public.user_activity_days (
    user_id,
    activity_date,
    first_seen_at,
    last_seen_at,
    heartbeat_count,
    created_at,
    updated_at
  )
  values (
    current_user_id,
    brisbane_day,
    now_ts,
    now_ts,
    1,
    now_ts,
    now_ts
  )
  on conflict (user_id, activity_date)
  do update set
    last_seen_at = excluded.last_seen_at,
    heartbeat_count = public.user_activity_days.heartbeat_count + 1,
    updated_at = excluded.updated_at;
end;
$$;

grant execute on function public.mark_user_activity() to authenticated;

-- Optional checks.
select
  (select count(*) from public.profiles) as accounts,
  (select count(*) from public.user_activity_days) as daily_activity_rows;
