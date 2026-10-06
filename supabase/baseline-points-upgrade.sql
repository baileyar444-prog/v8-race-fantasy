-- V8 Race Fantasy missed-team baseline points upgrade.
-- Run this once in Supabase SQL Editor.
--
-- New rule:
-- If an account does not enter a team for a locked event, they receive 150 points.
-- This script also backfills the 150-point baseline for already locked rounds.

alter table public.fantasy_scores
add column if not exists fantasy_team_id uuid references public.fantasy_teams(id) on delete set null,
add column if not exists raw_team_score numeric not null default 0,
add column if not exists regular_points numeric not null default 0,
add column if not exists captain_points numeric not null default 0,
add column if not exists vice_captain_points numeric not null default 0,
add column if not exists event_multiplier numeric not null default 1,
add column if not exists picks_count integer not null default 0,
add column if not exists status text not null default 'published';

create unique index if not exists fantasy_scores_user_event_unique
on public.fantasy_scores(user_id, event_id);

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

drop policy if exists "creators can manage scores" on public.fantasy_scores;
create policy "creators can manage scores"
on public.fantasy_scores
for all
using (public.is_creator())
with check (public.is_creator());

drop policy if exists "authenticated can read published fantasy scores" on public.fantasy_scores;
create policy "authenticated can read published fantasy scores"
on public.fantasy_scores
for select
to authenticated
using (true);

-- Backfill baseline scores for locked events where a profile did not save a team.
-- This will not touch accounts that have a saved team for that event.
with locked_events as (
  select id, slug, name
  from public.events
  where slug in ('perth', 'ipswich', 'the-bend', 'bathurst', 'gold-coast', 'sandown', 'adelaide')
    and (
      manual_lock = true
      or (
        lockout_at is not null
        and lockout_at <= now()
      )
    )
),
missing_team_scores as (
  select
    p.id as user_id,
    e.id as event_id
  from public.profiles p
  cross join locked_events e
  left join public.fantasy_teams ft
    on ft.user_id = p.id
   and ft.event_id = e.id
  where ft.id is null
)
insert into public.fantasy_scores (
  user_id,
  event_id,
  fantasy_team_id,
  normalised_event_score,
  published_score,
  raw_team_score,
  regular_points,
  captain_points,
  vice_captain_points,
  event_multiplier,
  picks_count,
  status,
  calculated_at
)
select
  user_id,
  event_id,
  null,
  150,
  150,
  150,
  150,
  0,
  0,
  1,
  0,
  'baseline',
  now()
from missing_team_scores
on conflict (user_id, event_id)
do update set
  fantasy_team_id = null,
  normalised_event_score = 150,
  published_score = 150,
  raw_team_score = 150,
  regular_points = 150,
  captain_points = 0,
  vice_captain_points = 0,
  event_multiplier = 1,
  picks_count = 0,
  status = 'baseline',
  calculated_at = now()
where not exists (
  select 1
  from public.fantasy_teams ft
  where ft.user_id = excluded.user_id
    and ft.event_id = excluded.event_id
);

select
  e.name,
  count(fs.user_id) filter (where fs.status = 'baseline') as baseline_scores,
  count(fs.user_id) filter (where fs.status <> 'baseline' or fs.status is null) as normal_scores
from public.events e
left join public.fantasy_scores fs
  on fs.event_id = e.id
where e.slug in ('perth', 'ipswich', 'the-bend', 'bathurst', 'gold-coast', 'sandown', 'adelaide')
group by e.name, e.sort_order
order by e.sort_order;
