-- V8 Race Fantasy admin stats permissions.
-- Run this once in Supabase SQL Editor so the admin account can read website statistics.

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

drop policy if exists "admins can read all profiles for stats" on public.profiles;
create policy "admins can read all profiles for stats"
on public.profiles
for select
using (public.is_creator());

drop policy if exists "admins can read all fantasy teams for stats" on public.fantasy_teams;
create policy "admins can read all fantasy teams for stats"
on public.fantasy_teams
for select
using (public.is_creator());

drop policy if exists "admins can read all fantasy team picks for stats" on public.fantasy_team_picks;
create policy "admins can read all fantasy team picks for stats"
on public.fantasy_team_picks
for select
using (public.is_creator());

drop policy if exists "admins can read all fantasy scores for stats" on public.fantasy_scores;
create policy "admins can read all fantasy scores for stats"
on public.fantasy_scores
for select
using (public.is_creator());

drop policy if exists "admins can read all leagues for stats" on public.leagues;
create policy "admins can read all leagues for stats"
on public.leagues
for select
using (public.is_creator());

drop policy if exists "admins can read all league members for stats" on public.league_members;
create policy "admins can read all league members for stats"
on public.league_members
for select
using (public.is_creator());

-- Optional check.
select
  (select count(*) from public.profiles) as accounts,
  (select count(*) from public.leagues) as leagues,
  (select count(*) from public.fantasy_teams) as saved_teams;
