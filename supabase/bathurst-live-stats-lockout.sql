-- V8 Race Fantasy: Bathurst live stats + lockout update
-- Run in Supabase SQL Editor after deploying the matching website update.
-- Requested lockout: Friday 9 October 2026 at 3:15 PM AEST (UTC+10).

update public.events
set
  lockout_at = '2026-10-09T15:15:00+10:00',
  manual_lock = false,
  is_open_event = true,
  number_of_races = 1,
  event_multiplier = 2
where slug = 'bathurst';

-- Keep every other event from being marked as the open event.
update public.events
set is_open_event = false
where slug <> 'bathurst';

-- Check the saved Bathurst setup.
select
  slug,
  name,
  is_open_event,
  manual_lock,
  lockout_at,
  number_of_races,
  event_multiplier
from public.events
where slug = 'bathurst';

-- Optional live-stat sanity check: current Bathurst saved teams.
select
  count(*) as bathurst_teams_saved
from public.fantasy_teams ft
join public.events e on e.id = ft.event_id
where e.slug = 'bathurst';
