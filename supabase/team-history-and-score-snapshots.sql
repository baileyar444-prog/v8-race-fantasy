-- V8 Race Fantasy team history + score snapshot upgrade.
-- Run this once in Supabase SQL Editor after uploading this app version.
-- It makes every event remember the user's picks, captaincy, driver points and final event score.

create extension if not exists pgcrypto;

-- Keep old teams frozen by timestamping when they are scored/published.
alter table public.fantasy_teams
add column if not exists locked_at timestamptz,
add column if not exists score_published_at timestamptz,
add column if not exists status text not null default 'saved';

-- Add richer saved event score fields. Existing columns are kept.
alter table public.fantasy_scores
add column if not exists fantasy_team_id uuid references public.fantasy_teams(id) on delete set null,
add column if not exists raw_team_score numeric not null default 0,
add column if not exists regular_points numeric not null default 0,
add column if not exists captain_points numeric not null default 0,
add column if not exists vice_captain_points numeric not null default 0,
add column if not exists event_multiplier numeric not null default 1,
add column if not exists picks_count integer not null default 0,
add column if not exists status text not null default 'published';

-- One saved driver-score row per user, event and category.
create table if not exists public.fantasy_pick_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  fantasy_team_id uuid not null references public.fantasy_teams(id) on delete cascade,
  category text not null,
  driver_id uuid not null references public.drivers(id) on delete restrict,
  driver_name text not null,
  team_name text not null,
  car_number text not null,
  base_driver_score numeric not null default 0,
  captain_multiplier numeric not null default 1,
  multiplied_driver_score numeric not null default 0,
  final_driver_score numeric not null default 0,
  is_captain boolean not null default false,
  is_vice_captain boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fantasy_team_id, event_id, category)
);

alter table public.fantasy_pick_scores enable row level security;

create index if not exists fantasy_pick_scores_user_event_idx
on public.fantasy_pick_scores(user_id, event_id);

create index if not exists fantasy_pick_scores_event_idx
on public.fantasy_pick_scores(event_id);

-- Users can see their own saved driver score snapshots.
drop policy if exists "users can read own fantasy pick scores" on public.fantasy_pick_scores;
create policy "users can read own fantasy pick scores"
on public.fantasy_pick_scores
for select
using (auth.uid() = user_id);

-- Admin/Race Control can publish and republish snapshots.
drop policy if exists "creators can manage fantasy pick scores" on public.fantasy_pick_scores;
create policy "creators can manage fantasy pick scores"
on public.fantasy_pick_scores
for all
using (public.is_creator())
with check (public.is_creator());

-- Keep score and team management admin safe for publishing/republishing.
drop policy if exists "creators can manage scores" on public.fantasy_scores;
create policy "creators can manage scores" on public.fantasy_scores
for all using (public.is_creator()) with check (public.is_creator());

-- Helpful checks.
select 'fantasy_teams' as table_name, count(*) from public.fantasy_teams
union all
select 'fantasy_scores' as table_name, count(*) from public.fantasy_scores
union all
select 'fantasy_pick_scores' as table_name, count(*) from public.fantasy_pick_scores;
