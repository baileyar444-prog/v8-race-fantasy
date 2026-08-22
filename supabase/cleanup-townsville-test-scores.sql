-- Removes old Townsville test scoring data so it cannot count toward totals.
-- Safe to run more than once.

with target_events as (
  select id from public.events
  where lower(coalesce(slug, '')) = 'townsville'
     or lower(coalesce(name, '')) = 'townsville'
     or lower(coalesce(full_name, '')) like '%townsville%'
),
target_teams as (
  select id from public.fantasy_teams
  where event_id in (select id from target_events)
)
delete from public.fantasy_pick_scores
where event_id in (select id from target_events);

with target_events as (
  select id from public.events
  where lower(coalesce(slug, '')) = 'townsville'
     or lower(coalesce(name, '')) = 'townsville'
     or lower(coalesce(full_name, '')) like '%townsville%'
)
delete from public.fantasy_scores
where event_id in (select id from target_events);

with target_events as (
  select id from public.events
  where lower(coalesce(slug, '')) = 'townsville'
     or lower(coalesce(name, '')) = 'townsville'
     or lower(coalesce(full_name, '')) like '%townsville%'
)
delete from public.race_results
where event_id in (select id from target_events);

with target_events as (
  select id from public.events
  where lower(coalesce(slug, '')) = 'townsville'
     or lower(coalesce(name, '')) = 'townsville'
     or lower(coalesce(full_name, '')) like '%townsville%'
),
target_teams as (
  select id from public.fantasy_teams
  where event_id in (select id from target_events)
)
delete from public.fantasy_team_picks
where fantasy_team_id in (select id from target_teams);

with target_events as (
  select id from public.events
  where lower(coalesce(slug, '')) = 'townsville'
     or lower(coalesce(name, '')) = 'townsville'
     or lower(coalesce(full_name, '')) like '%townsville%'
)
delete from public.fantasy_teams
where event_id in (select id from target_events);

delete from public.events
where lower(coalesce(slug, '')) = 'townsville'
   or lower(coalesce(name, '')) = 'townsville'
   or lower(coalesce(full_name, '')) like '%townsville%';

select 'Townsville test data cleanup complete' as status;
