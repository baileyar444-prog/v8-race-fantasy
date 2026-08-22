-- V8 Race Fantasy Ipswich ready update.
-- Run this once in Supabase SQL Editor after Perth is complete.
-- It closes Perth, opens Ipswich, refreshes the post-Perth standings/classes,
-- adds the two Ipswich wildcards requested, and keeps the expanded 26-car field active.

create extension if not exists pgcrypto;

alter table public.drivers
add column if not exists poles integer not null default 0;

alter table public.drivers
add column if not exists last_round_fantasy_points numeric not null default 0;

-- Keep only Ipswich open now that Perth is complete.
update public.events
set is_open_event = false;

insert into public.events (
  slug,
  name,
  full_name,
  lockout_at,
  manual_lock,
  is_open_event,
  number_of_races,
  event_multiplier,
  sort_order
)
values
  ('perth', 'Perth', 'Perth', '2026-08-01T11:45:00+10:00', false, false, 3, 1, 1),
  ('ipswich', 'Ipswich', 'Ipswich', '2026-08-22T10:05:00+10:00', false, true, 3, 1, 2),
  ('the-bend', 'The Bend', 'The Bend', '2026-09-11T09:00:00+09:30', false, false, 1, 1, 3),
  ('bathurst', 'Bathurst', 'Bathurst', '2026-10-08T09:00:00+11:00', false, false, 1, 2, 4),
  ('gold-coast', 'Gold Coast', 'Gold Coast', '2026-10-23T09:00:00+10:00', false, false, 2, 1, 5),
  ('sandown', 'Sandown', 'Sandown', '2026-11-06T09:00:00+11:00', false, false, 2, 1, 6),
  ('adelaide', 'Adelaide', 'Adelaide', '2026-11-26T09:00:00+10:30', false, false, 3, 2, 7)
on conflict (slug) do update set
  name = excluded.name,
  full_name = excluded.full_name,
  lockout_at = excluded.lockout_at,
  manual_lock = excluded.manual_lock,
  is_open_event = excluded.is_open_event,
  number_of_races = excluded.number_of_races,
  event_multiplier = excluded.event_multiplier,
  sort_order = excluded.sort_order;

-- Post-Perth championship classes for Ipswich.
-- A-D = four cars each. E-F = five cars each to handle the 27-car Ipswich field.
-- Bayley Hall and Ben Gomersall are wildcards, using technical positions 25/26 for sorting.
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
  ('matthew-payne', '19', 'Matthew Payne', 'Penrite Racing', 'A', 1, 1950, 5, 5, true),
  ('broc-feeney', '88', 'Broc Feeney', 'Red Bull Ampol Racing', 'A', 2, 1832, 5, 4, true),
  ('cam-waters', '6', 'Cam Waters', 'Monster Castrol Racing', 'A', 3, 1673, 2, 3, true),
  ('brodie-kostecki', '17', 'Brodie Kostecki', 'Shell V-Power Racing Team', 'A', 4, 1590, 6, 5, true),
  ('kai-allen', '26', 'Kai Allen', 'Penrite Racing', 'B', 5, 1565, 2, 0, true),
  ('anton-de-pasquale', '18', 'Anton De Pasquale', 'DEWALT Racing', 'B', 6, 1535, 2, 1, true),
  ('will-brown', '888', 'Will Brown', 'Red Bull Ampol Racing', 'B', 7, 1365, 0, 1, true),
  ('chaz-mostert', '1', 'Chaz Mostert', 'Mobil1 Optus Racing', 'B', 8, 1303, 1, 1, true),
  ('ryan-wood', '2', 'Ryan Wood', 'Mobil1 Truck Assist Racing', 'C', 9, 1235, 1, 2, true),
  ('jack-le-brocq', '4', 'Jack Le Brocq', 'Sherrin Rentals Racing', 'C', 10, 1095, 0, 0, true),
  ('james-golding', '7', 'James Golding', 'CoolDrive Racing', 'C', 11, 1075, 0, 1, true),
  ('thomas-randle', '55', 'Thomas Randle', 'Monster Castrol Racing', 'C', 12, 976, 0, 0, true),
  ('andre-heimgartner', '8', 'Andre Heimgartner', 'R&J Batteries Racing', 'D', 13, 967, 1, 1, true),
  ('jayden-ojeda', '31', 'Jayden Ojeda', 'PremiAir Racing', 'D', 14, 963, 0, 0, true),
  ('david-reynolds', '20', 'David Reynolds', 'Snowy River Caravans Racing', 'D', 15, 872, 0, 0, true),
  ('cameron-hill', '14', 'Cameron Hill', 'Brad Jones Racing', 'D', 16, 771, 0, 0, true),
  ('zach-bates', '10', 'Zach Bates', 'Bendix Racing', 'E', 17, 657, 0, 0, true),
  ('declan-fraser', '777', 'Declan Fraser', 'PremiAir Racing', 'E', 18, 644, 0, 0, true),
  ('aaron-cameron', '3', 'Aaron Cameron', 'LIQUI MOLY BLAHST Racing', 'E', 19, 639, 0, 0, true),
  ('rylan-gray', '38', 'Rylan Gray', 'Shell V-Power Racing Team', 'E', 20, 624, 0, 0, true),
  ('cooper-murray', '99', 'Cooper Murray', 'Erebus Motorsport', 'E', 21, 608, 0, 0, true),
  ('macauley-jones', '96', 'Macauley Jones', 'Brad Jones Racing', 'F', 22, 594, 0, 0, true),
  ('jackson-walls', '11', 'Jackson Walls', 'Objective Racing', 'F', 23, 509, 0, 0, true),
  ('jobe-stewart', '9', 'Jobe Stewart', 'Erebus Motorsport', 'F', 24, 498, 0, 0, true),
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

update public.drivers
set is_active = false
where slug not in (
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

-- Update driver-card last round fantasy points from Perth results if Race Control has the results saved.
with perth_event as (
  select id from public.events where slug = 'perth' limit 1
), perth_driver_scores as (
  select
    rr.driver_id,
    round(avg(rr.race_fantasy_points))::integer as last_points
  from public.race_results rr
  join perth_event pe on pe.id = rr.event_id
  group by rr.driver_id
)
update public.drivers d
set last_round_fantasy_points = coalesce(pds.last_points, 0)
from perth_driver_scores pds
where d.id = pds.driver_id;

update public.drivers
set last_round_fantasy_points = 0
where slug in ('bayley-hall', 'ben-gomersall');

select category, count(*) as drivers
from public.drivers
where is_active = true
group by category
order by category;

select
  case when championship_points <= 0 then 'N/A' else points_position::text end as championship_position,
  car_number,
  driver_name,
  team_name,
  category,
  championship_points,
  wins,
  poles,
  last_round_fantasy_points
from public.drivers
where is_active = true
order by points_position;

select slug, name, is_open_event, lockout_at, number_of_races
from public.events
where slug in ('perth','ipswich')
order by sort_order;
