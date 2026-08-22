-- V8 Race Fantasy carry-forward teams update.
-- Run this once in Supabase SQL Editor.
--
-- New rule for Ipswich and future rounds:
-- - If a user saved a team for the current event, score that team.
-- - If they did not save a team, carry forward their latest previous event team.
-- - If a carried-forward driver no longer belongs to the same category, that category is left blank/N/A.
-- - If they have no previous team at all, apply the 150-point baseline.

alter table public.fantasy_teams
add column if not exists status text not null default 'saved',
add column if not exists source_event_id uuid references public.events(id) on delete set null,
add column if not exists source_event_name text,
add column if not exists carried_forward_at timestamptz;

alter table public.fantasy_scores
add column if not exists fantasy_team_id uuid references public.fantasy_teams(id) on delete set null,
add column if not exists raw_team_score numeric not null default 0,
add column if not exists regular_points numeric not null default 0,
add column if not exists captain_points numeric not null default 0,
add column if not exists vice_captain_points numeric not null default 0,
add column if not exists event_multiplier numeric not null default 1,
add column if not exists picks_count integer not null default 0,
add column if not exists status text not null default 'published';

create unique index if not exists fantasy_teams_user_event_unique
on public.fantasy_teams(user_id, event_id);

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

-- Ensure admin can manage carried-forward teams and score rows.
drop policy if exists "creators can manage fantasy teams" on public.fantasy_teams;
create policy "creators can manage fantasy teams"
on public.fantasy_teams
for all
using (public.is_creator())
with check (public.is_creator());

drop policy if exists "creators can manage fantasy team picks" on public.fantasy_team_picks;
create policy "creators can manage fantasy team picks"
on public.fantasy_team_picks
for all
using (public.is_creator())
with check (public.is_creator());

drop policy if exists "creators can manage scores" on public.fantasy_scores;
create policy "creators can manage scores"
on public.fantasy_scores
for all
using (public.is_creator())
with check (public.is_creator());

drop policy if exists "authenticated can read public profile basics" on public.profiles;
create policy "authenticated can read public profile basics"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "authenticated can read published fantasy scores" on public.fantasy_scores;
create policy "authenticated can read published fantasy scores"
on public.fantasy_scores
for select
to authenticated
using (true);

-- Users can read teams after lockout, their own teams, or if admin.
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

-- Users can read picks after lockout, their own picks, or if admin.
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

-- Carry forward the latest previous event team for users missing the target event.
-- Only keeps a previous driver if that driver is still active and still in the same category.
create or replace function public.apply_carried_forward_teams_for_event(target_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_creator() then
    raise exception 'Admin only';
  end if;

  with target_event as (
    select id, sort_order
    from public.events
    where id = target_event_id
  ),
  missing_users as (
    select p.id as user_id
    from public.profiles p
    cross join target_event te
    left join public.fantasy_teams current_team
      on current_team.user_id = p.id
     and current_team.event_id = te.id
    where current_team.id is null
  ),
  latest_previous as (
    select distinct on (ft.user_id)
      ft.user_id,
      ft.id as previous_team_id,
      ft.event_id as previous_event_id,
      ft.captain_driver_id,
      ft.vice_captain_driver_id,
      coalesce(ft.source_event_id, ft.event_id) as original_source_event_id,
      coalesce(ft.source_event_name, e.name) as original_source_event_name,
      e.sort_order as previous_sort_order
    from public.fantasy_teams ft
    join public.events e on e.id = ft.event_id
    join target_event te on e.sort_order < te.sort_order
    join missing_users mu on mu.user_id = ft.user_id
    order by ft.user_id, e.sort_order desc
  ),
  created_teams as (
    insert into public.fantasy_teams (
      user_id,
      event_id,
      captain_driver_id,
      vice_captain_driver_id,
      status,
      source_event_id,
      source_event_name,
      carried_forward_at,
      submitted_at
    )
    select
      lp.user_id,
      target_event_id,
      case when exists (
        select 1
        from public.fantasy_team_picks fp
        join public.drivers d on d.id = fp.driver_id
        where fp.fantasy_team_id = lp.previous_team_id
          and fp.driver_id = lp.captain_driver_id
          and d.is_active = true
          and d.category = fp.category
      ) then lp.captain_driver_id else null end,
      case when exists (
        select 1
        from public.fantasy_team_picks fp
        join public.drivers d on d.id = fp.driver_id
        where fp.fantasy_team_id = lp.previous_team_id
          and fp.driver_id = lp.vice_captain_driver_id
          and d.is_active = true
          and d.category = fp.category
      ) then lp.vice_captain_driver_id else null end,
      'carried_forward',
      lp.original_source_event_id,
      lp.original_source_event_name,
      now(),
      now()
    from latest_previous lp
    on conflict (user_id, event_id)
    do nothing
    returning id, user_id
  )
  insert into public.fantasy_team_picks (
    fantasy_team_id,
    category,
    driver_id
  )
  select
    ct.id,
    fp.category,
    fp.driver_id
  from created_teams ct
  join latest_previous lp on lp.user_id = ct.user_id
  join public.fantasy_team_picks fp on fp.fantasy_team_id = lp.previous_team_id
  join public.drivers d on d.id = fp.driver_id
  where d.is_active = true
    and d.category = fp.category
  on conflict (fantasy_team_id, category)
  do update set driver_id = excluded.driver_id;
end;
$$;

-- Applies 150 baseline for a single user for locked events where no team exists.
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

-- Race Control calls this immediately before publishing/republishing a locked event.
create or replace function public.prepare_event_scoring(target_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_event public.events%rowtype;
  profile_record record;
begin
  if not public.is_creator() then
    raise exception 'Admin only';
  end if;

  select * into target_event
  from public.events
  where id = target_event_id;

  if target_event.id is null then
    raise exception 'Event not found';
  end if;

  if not (
    target_event.manual_lock = true
    or (
      target_event.lockout_at is not null
      and target_event.lockout_at <= now()
    )
  ) then
    raise exception 'Event must be locked before carry-forward or baseline scores are applied';
  end if;

  perform public.apply_carried_forward_teams_for_event(target_event_id);

  for profile_record in
    select p.id
    from public.profiles p
    left join public.fantasy_teams ft
      on ft.user_id = p.id
     and ft.event_id = target_event_id
    where ft.id is null
  loop
    perform public.apply_missed_round_baselines(profile_record.id);
  end loop;
end;
$$;

grant execute on function public.prepare_event_scoring(uuid) to authenticated;
grant execute on function public.apply_carried_forward_teams_for_event(uuid) to authenticated;
grant execute on function public.apply_missed_round_baselines(uuid) to authenticated;

-- Immediate repair for Perth and any other already-locked rounds.
-- This makes 0/null no-team scores become 150 baseline and fills missing no-team score rows.
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
  and e.slug in ('perth', 'ipswich', 'the-bend', 'bathurst', 'gold-coast', 'sandown', 'adelaide')
  and coalesce(fs.published_score, 0) = 0
  and not exists (
    select 1
    from public.fantasy_teams ft
    where ft.user_id = fs.user_id
      and ft.event_id = fs.event_id
  );

select
  e.name,
  count(fs.user_id) filter (where fs.status = 'baseline') as baseline_150_scores,
  count(ft.id) filter (where ft.status = 'carried_forward') as carried_forward_teams,
  count(ft.id) filter (where coalesce(ft.status, 'saved') <> 'carried_forward') as saved_or_scored_teams,
  count(p.id) filter (where fs.user_id is null and ft.id is null) as accounts_without_score_or_team
from public.events e
cross join public.profiles p
left join public.fantasy_teams ft
  on ft.event_id = e.id
 and ft.user_id = p.id
left join public.fantasy_scores fs
  on fs.event_id = e.id
 and fs.user_id = p.id
where e.slug in ('perth', 'ipswich', 'the-bend', 'bathurst', 'gold-coast', 'sandown', 'adelaide')
group by e.name, e.sort_order
order by e.sort_order;
