-- V8 Race Fantasy round banner + public locked-round picks upgrade.
-- Run once in Supabase SQL Editor.
--
-- Adds safe read permissions so logged-in users can see who selected who
-- AFTER a round has locked. Upcoming/live teams stay protected before lockout.

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

-- Read all saved teams only after that event has locked, or if it is your own team/admin.
drop policy if exists "authenticated can read locked round teams" on public.fantasy_teams;
create policy "authenticated can read locked round teams"
on public.fantasy_teams
for select
to authenticated
using (
  auth.uid() = user_id
  or public.is_creator()
  or exists (
    select 1
    from public.events
    where events.id = fantasy_teams.event_id
      and (
        events.manual_lock = true
        or (
          events.lockout_at is not null
          and events.lockout_at <= now()
        )
      )
  )
);

-- Read team picks only after that team's event has locked, or if it is your own team/admin.
drop policy if exists "authenticated can read locked round team picks" on public.fantasy_team_picks;
create policy "authenticated can read locked round team picks"
on public.fantasy_team_picks
for select
to authenticated
using (
  exists (
    select 1
    from public.fantasy_teams ft
    join public.events e on e.id = ft.event_id
    where ft.id = fantasy_team_picks.fantasy_team_id
      and (
        ft.user_id = auth.uid()
        or public.is_creator()
        or e.manual_lock = true
        or (
          e.lockout_at is not null
          and e.lockout_at <= now()
        )
      )
  )
);

-- Let logged-in users read public profile basics needed for leaderboard and round-picks display.
-- Your app only selects display fields on public pages, not email.
drop policy if exists "authenticated can read public profile basics" on public.profiles;
create policy "authenticated can read public profile basics"
on public.profiles
for select
to authenticated
using (true);

-- The slim top banner and leaderboard need published score rows.
drop policy if exists "authenticated can read published fantasy scores" on public.fantasy_scores;
create policy "authenticated can read published fantasy scores"
on public.fantasy_scores
for select
to authenticated
using (true);

-- Optional check.
select
  (select count(*) from public.fantasy_teams) as saved_teams,
  (select count(*) from public.fantasy_team_picks) as saved_picks,
  (select count(*) from public.fantasy_scores) as published_scores;
