-- GOLD COAST DRIVER CHANGE: MURRAY / HUGHES / FRASER
-- Run this by itself in Supabase SQL Editor.
-- It does NOT touch Bathurst results or scores.

-- Cooper Murray keeps his current championship position/points,
-- but moves to the #777 PremiAir Racing entry.
update public.drivers
set
  car_number = '777',
  team_name = 'PremiAir Racing',
  category = 'E'::driver_category,
  points_position = 18,
  championship_points = 972,
  is_active = true
where slug = 'cooper-murray';

-- Declan Fraser is no longer on the active Gold Coast grid.
-- Keep his historical championship data/results intact.
update public.drivers
set is_active = false
where slug = 'declan-fraser';

-- Jarrod Hughes takes the #99 Erebus Motorsport entry.
-- The database uses 999 / 0 internally so he sorts to the end and
-- the website displays Position N/A / Season points N/A.
insert into public.drivers (
  slug, car_number, driver_name, team_name, category,
  points_position, championship_points, wins, poles,
  last_round_fantasy_points, is_active
)
values (
  'jarrod-hughes', '99', 'Jarrod Hughes', 'Erebus Motorsport', 'F'::driver_category,
  999, 0, 0, 0, 0, true
)
on conflict (slug) do update set
  car_number = excluded.car_number,
  driver_name = excluded.driver_name,
  team_name = excluded.team_name,
  category = excluded.category,
  points_position = excluded.points_position,
  championship_points = excluded.championship_points,
  wins = excluded.wins,
  poles = excluded.poles,
  last_round_fantasy_points = excluded.last_round_fantasy_points,
  is_active = true;

-- Remove any Gold Coast pick of Declan Fraser.
-- We do NOT auto-replace him: affected users must choose a new Category F driver.
with gc as (
  select id from public.events where slug = 'gold-coast' limit 1
), declan as (
  select id from public.drivers where slug = 'declan-fraser' limit 1
)
delete from public.fantasy_team_picks ftp
using public.fantasy_teams ft, gc, declan
where ftp.fantasy_team_id = ft.id
  and ft.event_id = gc.id
  and ftp.driver_id = declan.id;

-- Clear captain/vice if an affected team had Declan selected there.
with gc as (
  select id from public.events where slug = 'gold-coast' limit 1
), declan as (
  select id from public.drivers where slug = 'declan-fraser' limit 1
)
update public.fantasy_teams ft
set
  captain_driver_id = case when ft.captain_driver_id = declan.id then null else ft.captain_driver_id end,
  vice_captain_driver_id = case when ft.vice_captain_driver_id = declan.id then null else ft.vice_captain_driver_id end
from gc, declan
where ft.event_id = gc.id
  and (ft.captain_driver_id = declan.id or ft.vice_captain_driver_id = declan.id);

-- CHECK 1: Gold Coast should still have 24 active drivers.
select count(*) as active_gold_coast_drivers
from public.drivers
where is_active = true;

-- CHECK 2: A-F should each have four active drivers.
select category, count(*) as drivers
from public.drivers
where is_active = true
group by category
order by category;

-- CHECK 3: verify the three changed drivers.
select
  slug, car_number, driver_name, team_name, category,
  points_position, championship_points, is_active
from public.drivers
where slug in ('cooper-murray', 'declan-fraser', 'jarrod-hughes')
order by slug;
