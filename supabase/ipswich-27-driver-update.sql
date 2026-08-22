-- V8 Race Fantasy Ipswich 27-driver update.
-- Run this once in Supabase SQL Editor.
--
-- Adds Aaron Seton to the Ipswich field:
-- #30 Aaron Seton, Matt Stone Racing, Category F, 25th in standings, 72 pts.
-- Category F becomes 6 drivers for Ipswich.
-- P27 finish position is supported in the website scoring code.

alter table public.drivers
add column if not exists poles integer not null default 0,
add column if not exists last_round_fantasy_points numeric not null default 0;

insert into public.drivers (
  slug,
  car_number,
  driver_name,
  team_name,
  category,
  points_position,
  championship_points,
  wins,
  poles,
  is_active
)
values
  ('aaron-seton', '30', 'Aaron Seton', 'Matt Stone Racing', 'F', 25, 72, 0, 0, true),
  ('bayley-hall', '15', 'Bayley Hall', 'Team 18', 'F', 26, 0, 0, 0, true),
  ('ben-gomersall', '5', 'Ben Gomersall', 'Tickford Racing', 'F', 27, 0, 0, 0, true)
on conflict (slug) do update set
  car_number = excluded.car_number,
  driver_name = excluded.driver_name,
  team_name = excluded.team_name,
  category = excluded.category,
  points_position = excluded.points_position,
  championship_points = excluded.championship_points,
  wins = excluded.wins,
  poles = excluded.poles,
  is_active = true;

-- Keep the full current Ipswich field active, now 27 cars.
update public.drivers
set is_active = true
where slug in (
  'matthew-payne',
  'broc-feeney',
  'cam-waters',
  'brodie-kostecki',
  'kai-allen',
  'anton-de-pasquale',
  'will-brown',
  'chaz-mostert',
  'ryan-wood',
  'jack-le-brocq',
  'james-golding',
  'thomas-randle',
  'andre-heimgartner',
  'jayden-ojeda',
  'david-reynolds',
  'cameron-hill',
  'zach-bates',
  'declan-fraser',
  'aaron-cameron',
  'rylan-gray',
  'cooper-murray',
  'macauley-jones',
  'jackson-walls',
  'jobe-stewart',
  'aaron-seton',
  'bayley-hall',
  'ben-gomersall'
);

-- Mark old/non-current names inactive, but do not deactivate Aaron Seton.
update public.drivers
set is_active = false
where slug in ('todd-hazelwood', 'reuben-goodall', 'mark-winterbottom');

-- Checks.
select
  category,
  count(*) as active_drivers
from public.drivers
where is_active = true
group by category
order by category;

select
  points_position,
  car_number,
  driver_name,
  team_name,
  category,
  championship_points,
  is_active
from public.drivers
where slug in ('aaron-seton', 'bayley-hall', 'ben-gomersall')
order by points_position;
