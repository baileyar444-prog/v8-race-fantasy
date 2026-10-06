-- V8 Race Fantasy: confirmed Ipswich Race 3 result + open The Bend.
-- Run this after you have already run:
--   1. ipswich-27-driver-update.sql
--   2. ipswich-race1-race2-results.sql
--   3. the Ipswich Race 3 qualifying / Top 10 Shootout SQL
--
-- This script:
-- - saves the confirmed Ipswich Race 3 result,
-- - updates Ipswich Race 3 fantasy points using qualifying + finish + classification,
-- - updates championship standings after Ipswich,
-- - closes Ipswich,
-- - opens The Bend for team submissions,
-- - sets The Bend active driver field to 26 cars:
--   normal 24 cars + #5 Ben Gomersall + #15 Craig Lowndes.
--
-- Fastest lap and racing penalty points are NOT used.

with ipswich_event as (
  select id
  from public.events
  where slug = 'ipswich'
  limit 1
),
race3(driver_slug, qualifying_position, finish_position, classification_text) as (
  values
    ('broc-feeney', 2, 1, 'finished'),
    ('brodie-kostecki', 4, 2, 'finished'),
    ('will-brown', 1, 3, 'finished'),
    ('kai-allen', 3, 4, 'finished'),
    ('james-golding', 8, 5, 'finished'),
    ('anton-de-pasquale', 11, 6, 'finished'),
    ('cam-waters', 7, 7, 'finished'),
    ('rylan-gray', 10, 8, 'finished'),
    ('david-reynolds', 14, 9, 'finished'),
    ('aaron-cameron', 9, 10, 'finished'),
    ('thomas-randle', 15, 11, 'finished'),
    ('cooper-murray', 16, 12, 'finished'),
    ('ryan-wood', 17, 13, 'finished'),
    ('andre-heimgartner', 12, 14, 'finished'),
    ('cameron-hill', 24, 15, 'finished'),
    ('zach-bates', 25, 16, 'finished'),
    ('jackson-walls', 18, 17, 'finished'),
    ('jayden-ojeda', 19, 18, 'finished'),
    ('declan-fraser', 26, 19, 'finished'),
    ('jack-le-brocq', 13, 20, 'finished'),
    ('jobe-stewart', 21, 21, 'finished'),
    ('aaron-seton', 23, 22, 'finished'),
    ('ben-gomersall', 20, 23, 'finished'),
    ('macauley-jones', 27, 24, 'finished'),
    ('bayley-hall', 22, 25, 'finished'),
    ('chaz-mostert', 5, null, 'dnf'),
    ('matthew-payne', 6, null, 'dnf')
),
scored as (
  select
    ie.id as event_id,
    3 as race_number,
    d.id as driver_id,
    r.qualifying_position,
    r.finish_position,
    r.classification_text::classification_status as classification,
    false as fastest_lap,
    'none'::penalty_type as penalty,
    case
      when r.classification_text in ('dns', 'dsq') then 0
      when r.qualifying_position = 1 then 20
      when r.qualifying_position = 2 then 17
      when r.qualifying_position = 3 then 15
      when r.qualifying_position = 4 then 13
      when r.qualifying_position = 5 then 11
      when r.qualifying_position between 6 and 10 then 16 - r.qualifying_position
      when r.qualifying_position between 11 and 15 then 16 - r.qualifying_position
      else 0
    end
    +
    case
      when r.classification_text in ('dns', 'dsq') then 0
      when r.finish_position = 1 then 60
      when r.finish_position = 2 then 54
      when r.finish_position = 3 then 49
      when r.finish_position = 4 then 45
      when r.finish_position = 5 then 41
      when r.finish_position = 6 then 38
      when r.finish_position = 7 then 35
      when r.finish_position = 8 then 32
      when r.finish_position = 9 then 29
      when r.finish_position = 10 then 26
      when r.finish_position = 11 then 24
      when r.finish_position = 12 then 22
      when r.finish_position = 13 then 20
      when r.finish_position = 14 then 18
      when r.finish_position = 15 then 16
      when r.finish_position = 16 then 14
      when r.finish_position = 17 then 12
      when r.finish_position = 18 then 10
      when r.finish_position = 19 then 8
      when r.finish_position = 20 then 6
      when r.finish_position = 21 then 5
      when r.finish_position = 22 then 4
      when r.finish_position = 23 then 3
      when r.finish_position = 24 then 2
      when r.finish_position in (25, 26, 27) then 1
      else 0
    end
    +
    case
      when r.classification_text = 'dnf' then -10
      when r.classification_text = 'dns' then -15
      when r.classification_text = 'dsq' then -25
      else 0
    end as race_fantasy_points
  from race3 r
  cross join ipswich_event ie
  join public.drivers d
    on d.slug = r.driver_slug
)
insert into public.race_results (
  event_id,
  race_number,
  driver_id,
  qualifying_position,
  finish_position,
  classification,
  fastest_lap,
  penalty,
  race_fantasy_points
)
select
  event_id,
  race_number,
  driver_id,
  qualifying_position,
  finish_position,
  classification,
  fastest_lap,
  penalty,
  race_fantasy_points
from scored
on conflict (event_id, race_number, driver_id)
do update set
  qualifying_position = excluded.qualifying_position,
  finish_position = excluded.finish_position,
  classification = excluded.classification,
  fastest_lap = excluded.fastest_lap,
  penalty = excluded.penalty,
  race_fantasy_points = excluded.race_fantasy_points;

-- Update post-Ipswich championship standings and The Bend categories.
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
    ('broc-feeney', '88', 'Broc Feeney', 'Triple Eight Race Engineering', 'A', 1, 2107, 6, 4, true),
    ('matthew-payne', '19', 'Matthew Payne', 'Grove Racing', 'A', 2, 2077, 5, 7, true),
    ('brodie-kostecki', '17', 'Brodie Kostecki', 'Dick Johnson Racing', 'A', 3, 1878, 7, 5, true),
    ('cam-waters', '6', 'Cameron Waters', 'Tickford Racing', 'A', 4, 1852, 2, 3, true),
    ('kai-allen', '26', 'Kai Allen', 'Grove Racing', 'B', 5, 1793, 2, 0, true),
    ('anton-de-pasquale', '18', 'Anton De Pasquale', 'Team 18', 'B', 6, 1697, 2, 1, true),
    ('will-brown', '888', 'Will Brown', 'Triple Eight Race Engineering', 'B', 7, 1636, 1, 2, true),
    ('chaz-mostert', '1', 'Chaz Mostert', 'Walkinshaw TWG Racing', 'B', 8, 1413, 1, 1, true),
    ('ryan-wood', '2', 'Ryan Wood', 'Walkinshaw TWG Racing', 'C', 9, 1340, 1, 2, true),
    ('james-golding', '7', 'James Golding', 'Blanchard Racing Team', 'C', 10, 1226, 0, 1, true),
    ('jack-le-brocq', '4', 'Jack Le Brocq', 'Matt Stone Racing', 'C', 11, 1171, 0, 0, true),
    ('thomas-randle', '55', 'Thomas Randle', 'Tickford Racing', 'C', 12, 1120, 0, 0, true),
    ('andre-heimgartner', '8', 'Andre Heimgartner', 'Brad Jones Racing', 'D', 13, 1084, 1, 1, true),
    ('jayden-ojeda', '31', 'Jayden Ojeda', 'PremiAir Racing', 'D', 14, 1028, 0, 0, true),
    ('david-reynolds', '20', 'David Reynolds', 'Team 18', 'D', 15, 983, 0, 0, true),
    ('cameron-hill', '14', 'Cameron Hill', 'Brad Jones Racing', 'D', 16, 865, 0, 0, true),
    ('aaron-cameron', '3', 'Aaron Cameron', 'Blanchard Racing Team', 'E', 17, 763, 0, 0, true),
    ('rylan-gray', '38', 'Rylan Gray', 'Dick Johnson Racing', 'E', 18, 762, 0, 0, true),
    ('zach-bates', '10', 'Zach Bates', 'Matt Stone Racing', 'E', 19, 729, 0, 0, true),
    ('declan-fraser', '777', 'Declan Fraser', 'PremiAir Racing', 'E', 20, 715, 0, 0, true),
    ('cooper-murray', '99', 'Cooper Murray', 'Erebus Motorsport', 'E', 21, 701, 0, 0, true),
    ('macauley-jones', '96', 'Macauley Jones', 'Brad Jones Racing', 'F', 22, 648, 0, 0, true),
    ('jackson-walls', '11', 'Jackson Walls', 'Triple Eight Race Engineering', 'F', 23, 596, 0, 0, true),
    ('jobe-stewart', '9', 'Jobe Stewart', 'Erebus Motorsport', 'F', 24, 538, 0, 0, true),
    ('aaron-seton', '30', 'Aaron Seton', 'Matt Stone Racing', 'F', 25, 98, 0, 0, false),
    ('todd-hazelwood', '17', 'Todd Hazelwood', 'Dick Johnson Racing', 'F', 26, 48, 0, 0, false),
    ('ben-gomersall', '5', 'Ben Gomersall', 'Tickford Racing', 'F', 27, 48, 0, 0, true),
    ('bayley-hall', '15', 'Bayley Hall', 'Team 18', 'F', 28, 47, 0, 0, false),
    ('reuben-goodall', '5', 'Reuben Goodall', 'Tickford Racing', 'F', 29, 44, 0, 0, false),
    ('mark-winterbottom', '55', 'Mark Winterbottom', 'Tickford Racing', 'F', 30, 21, 0, 0, false),
    ('craig-lowndes', '15', 'Craig Lowndes', 'Team 18', 'F', 31, 0, 0, 0, true)
on conflict (slug) do update set
  car_number = excluded.car_number,
  driver_name = excluded.driver_name,
  team_name = excluded.team_name,
  category = excluded.category,
  points_position = excluded.points_position,
  championship_points = excluded.championship_points,
  wins = excluded.wins,
  poles = excluded.poles,
  is_active = excluded.is_active;

-- Only the Bend field should be active now: 24 regulars + Ben Gomersall + Craig Lowndes.
update public.drivers
set is_active = slug in (
  'broc-feeney',
  'matthew-payne',
  'brodie-kostecki',
  'cam-waters',
  'kai-allen',
  'anton-de-pasquale',
  'will-brown',
  'chaz-mostert',
  'ryan-wood',
  'james-golding',
  'jack-le-brocq',
  'thomas-randle',
  'andre-heimgartner',
  'jayden-ojeda',
  'david-reynolds',
  'cameron-hill',
  'aaron-cameron',
  'rylan-gray',
  'zach-bates',
  'declan-fraser',
  'cooper-murray',
  'macauley-jones',
  'jackson-walls',
  'jobe-stewart',
  'ben-gomersall',
  'craig-lowndes'
);

-- Refresh last round fantasy points from Ipswich results.
with ipswich_event as (
  select id from public.events where slug = 'ipswich' limit 1
),
ipswich_driver_scores as (
  select
    rr.driver_id,
    round(avg(rr.race_fantasy_points))::integer as last_points
  from public.race_results rr
  join ipswich_event ie on ie.id = rr.event_id
  group by rr.driver_id
)
update public.drivers d
set last_round_fantasy_points = ids.last_points
from ipswich_driver_scores ids
where ids.driver_id = d.id;

-- Close Ipswich and open The Bend for team submissions.
update public.events
set is_open_event = false
where slug <> 'the-bend';

update public.events
set
  is_open_event = true,
  manual_lock = false
where slug = 'the-bend';

-- Checks.
select
  rr.race_number,
  count(*) as rows_saved,
  count(*) filter (where rr.finish_position is not null or rr.classification <> 'finished') as finish_rows_saved,
  sum(rr.race_fantasy_points) as total_driver_points
from public.race_results rr
join public.events e on e.id = rr.event_id
where e.slug = 'ipswich'
  and rr.race_number in (1, 2, 3)
group by rr.race_number
order by rr.race_number;

select
  e.slug,
  e.name,
  e.is_open_event,
  e.lockout_at,
  e.manual_lock
from public.events e
where e.slug in ('ipswich', 'the-bend')
order by e.sort_order;

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
  wins,
  poles,
  last_round_fantasy_points
from public.drivers
where is_active = true
order by points_position;
