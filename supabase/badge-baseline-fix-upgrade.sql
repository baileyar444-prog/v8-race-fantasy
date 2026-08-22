-- V8 Race Fantasy badge/login + baseline score fix.
-- Run this once in Supabase SQL Editor.
--
-- Fix:
-- - Any account that did not contest a locked round gets 150 points, not 0.
-- - Existing Perth 0 scores for accounts without a Perth team are corrected to 150.
-- - New signups automatically get 150 points for any already-locked rounds they missed.

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

-- Adds/repairs 150 baseline rows for one account for every already-locked event where no team exists.
create or replace function public.apply_missed_round_baselines(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
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
    target_user_id,
    e.id,
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
  from public.events e
  left join public.fantasy_teams ft
    on ft.user_id = target_user_id
   and ft.event_id = e.id
  where e.slug in ('perth', 'ipswich', 'the-bend', 'bathurst', 'gold-coast', 'sandown', 'adelaide')
    and ft.id is null
    and (
      e.manual_lock = true
      or (
        e.lockout_at is not null
        and e.lockout_at <= now()
      )
    )
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
end;
$$;

-- Trigger new profile rows so new signups are not left at 0 for already-finished rounds.
create or replace function public.apply_missed_round_baselines_on_profile_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.apply_missed_round_baselines(new.id);
  return new;
end;
$$;

drop trigger if exists apply_missed_round_baselines_after_profile_insert on public.profiles;

create trigger apply_missed_round_baselines_after_profile_insert
after insert on public.profiles
for each row
execute function public.apply_missed_round_baselines_on_profile_insert();

-- Backfill/repair every existing account now.
do $$
declare
  profile_record record;
begin
  for profile_record in
    select id
    from public.profiles
  loop
    perform public.apply_missed_round_baselines(profile_record.id);
  end loop;
end $$;

-- Extra Perth safety repair:
-- If an account has a Perth score of 0/null and has no Perth team, force it to 150 baseline.
update public.fantasy_scores fs
set
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
from public.events e
where fs.event_id = e.id
  and e.slug = 'perth'
  and coalesce(fs.published_score, 0) = 0
  and not exists (
    select 1
    from public.fantasy_teams ft
    where ft.user_id = fs.user_id
      and ft.event_id = fs.event_id
  );

-- Check Perth baseline/normal totals.
select
  e.name,
  count(fs.user_id) filter (where fs.status = 'baseline') as baseline_150_scores,
  count(fs.user_id) filter (where fs.status <> 'baseline' or fs.status is null) as normal_scores,
  count(p.id) filter (where fs.user_id is null) as accounts_without_any_score_row
from public.events e
cross join public.profiles p
left join public.fantasy_scores fs
  on fs.event_id = e.id
 and fs.user_id = p.id
where e.slug in ('perth', 'ipswich', 'the-bend', 'bathurst', 'gold-coast', 'sandown', 'adelaide')
group by e.name, e.sort_order
order by e.sort_order;
