-- GOLD COAST EVENT REPAIR
-- Safe to run after Bathurst results are already stored.

-- Close every event first so there can only be one live round.
update public.events
set is_open_event = false;

-- Bathurst is finished.
update public.events
set
  is_open_event = false,
  manual_lock = true,
  number_of_races = 1,
  event_multiplier = 2
where slug = 'bathurst';

-- Gold Coast is the live round.
update public.events
set
  is_open_event = true,
  manual_lock = false,
  lockout_at = '2026-10-24T11:30:00+10:00',
  number_of_races = 2,
  event_multiplier = 1
where slug = 'gold-coast';

-- CHECK: Gold Coast must be true / false / 24 Oct 11:30 AEST.
select
  slug,
  name,
  is_open_event,
  manual_lock,
  lockout_at,
  number_of_races,
  event_multiplier
from public.events
where slug in ('bathurst', 'gold-coast')
order by sort_order;
