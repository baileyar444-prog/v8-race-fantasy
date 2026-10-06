-- V8 Race Fantasy: UPDATED The Bend results, post-Bend standings and Bathurst reclassification.
-- Run this in Supabase SQL Editor.
--
-- What changed:
-- - James Golding is DSQ and receives 0 championship points.
-- - Aaron Cameron is DSQ and receives 0 championship points.
-- - Both are moved to the back of the The Bend fantasy result.
-- - The Bend fantasy race result is recalculated.
-- - Bathurst is opened.
-- - Ben Gomersall is removed from the next-round selectable field.
-- - James Moffat #34 Garry Rogers Motorsport is added as a Bathurst wildcard.
--
-- Fantasy scoring:
-- fantasy points = qualifying points + race finish points + classification adjustment.
-- Fastest lap and racing penalty points are NOT used.
-- DSQ = -25 fantasy points.

alter table public.drivers
add column if not exists poles integer not null default 0,
add column if not exists last_round_fantasy_points numeric not null default 0;

-- Save updated The Bend result.
-- Important #15 fantasy mapping:
-- The official result lists Bayley Hall/Craig Lowndes, but the selectable fantasy wildcard was Craig Lowndes.
-- This records the #15 fantasy result against craig-lowndes.
with bend_event as (
  select id
  from public.events
  where slug = 'the-bend'
  limit 1
),
bend_result(driver_slug, qualifying_position, finish_position, classification_text) as (
  values
    ('chaz-mostert', 11, 1, 'finished'),
    ('kai-allen', 6, 2, 'finished'),
    ('ryan-wood', 14, 3, 'finished'),
    ('will-brown', 13, 4, 'finished'),
    ('jayden-ojeda', 10, 5, 'finished'),
    ('matthew-payne', 2, 6, 'finished'),
    ('anton-de-pasquale', 5, 7, 'finished'),
    ('andre-heimgartner', 19, 8, 'finished'),
    ('rylan-gray', 20, 9, 'finished'),
    ('jack-le-brocq', 15, 10, 'finished'),
    ('thomas-randle', 4, 11, 'finished'),
    ('zach-bates', 8, 12, 'finished'),
    ('craig-lowndes', 22, 13, 'finished'),
    ('cam-waters', 3, 14, 'finished'),
    ('jobe-stewart', 9, 15, 'finished'),
    ('brodie-kostecki', 1, 16, 'finished'),
    ('cameron-hill', 26, 17, 'finished'),
    ('cooper-murray', 12, 18, 'finished'),
    ('jackson-walls', 21, 19, 'finished'),
    ('macauley-jones', 23, 20, 'finished'),
    ('ben-gomersall', 25, 21, 'finished'),
    ('david-reynolds', 16, 22, 'finished'),
    ('broc-feeney', 7, 23, 'finished'),
    ('declan-fraser', 24, null, 'dnf'),
    ('james-golding', 18, 25, 'dsq'),
    ('aaron-cameron', 17, 26, 'dsq')
),
scored as (
  select
    be.id as event_id,
    1 as race_number,
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
  from bend_result r
  cross join bend_event be
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

-- Update post-Bend championship standings and Bathurst categories.
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
  ('matthew-payne', '19', 'Matthew Payne', 'Grove Racing', 'A', 1, 2281, 5, 7, true),
  ('broc-feeney', '88', 'Broc Feeney', 'Triple Eight Race Engineering', 'A', 2, 2179, 6, 4, true),
  ('kai-allen', '26', 'Kai Allen', 'Grove Racing', 'A', 3, 2069, 2, 0, true),
  ('brodie-kostecki', '17', 'Brodie Kostecki', 'Dick Johnson Racing', 'A', 4, 1992, 7, 5, true),
  ('cam-waters', '6', 'Cameron Waters', 'Tickford Racing', 'B', 5, 1978, 2, 3, true),
  ('anton-de-pasquale', '18', 'Anton De Pasquale', 'Team 18', 'B', 6, 1889, 2, 1, true),
  ('will-brown', '888', 'Will Brown', 'Triple Eight Race Engineering', 'B', 7, 1876, 1, 2, true),
  ('chaz-mostert', '1', 'Chaz Mostert', 'Walkinshaw TWG Racing', 'B', 8, 1713, 2, 1, true),
  ('ryan-wood', '2', 'Ryan Wood', 'Walkinshaw TWG Racing', 'C', 9, 1598, 1, 2, true),
  ('jack-le-brocq', '4', 'Jack Le Brocq', 'Matt Stone Racing', 'C', 10, 1327, 0, 0, true),
  ('andre-heimgartner', '8', 'Andre Heimgartner', 'Brad Jones Racing', 'C', 11, 1264, 1, 1, true),
  ('thomas-randle', '55', 'Thomas Randle', 'Tickford Racing', 'C', 12, 1264, 0, 0, true),
  ('jayden-ojeda', '31', 'Jayden Ojeda', 'PremiAir Racing', 'D', 13, 1250, 0, 0, true),
  ('james-golding', '7', 'James Golding', 'Blanchard Racing Team', 'D', 14, 1226, 0, 1, true),
  ('david-reynolds', '20', 'David Reynolds', 'Team 18', 'D', 15, 1061, 0, 0, true),
  ('cameron-hill', '14', 'Cameron Hill', 'Brad Jones Racing', 'D', 16, 973, 0, 0, true),
  ('rylan-gray', '38', 'Rylan Gray', 'Dick Johnson Racing', 'E', 17, 930, 0, 0, true),
  ('zach-bates', '10', 'Zach Bates', 'Matt Stone Racing', 'E', 18, 867, 0, 0, true),
  ('cooper-murray', '99', 'Cooper Murray', 'Erebus Motorsport', 'E', 19, 803, 0, 0, true),
  ('aaron-cameron', '3', 'Aaron Cameron', 'Blanchard Racing Team', 'E', 20, 793, 0, 0, true),
  ('declan-fraser', '777', 'Declan Fraser', 'PremiAir Racing', 'E', 21, 781, 0, 0, true),
  ('macauley-jones', '96', 'Macauley Jones', 'Brad Jones Racing', 'F', 22, 738, 0, 0, true),
  ('jackson-walls', '11', 'Jackson Walls', 'Triple Eight Race Engineering', 'F', 23, 692, 0, 0, true),
  ('jobe-stewart', '9', 'Jobe Stewart', 'Erebus Motorsport', 'F', 24, 658, 0, 0, true),
  ('bayley-hall', '15', 'Bayley Hall', 'Team 18', 'F', 25, 179, 0, 0, false),
  ('ben-gomersall', '5', 'Ben Gomersall', 'Tickford Racing', 'F', 26, 132, 0, 0, false),
  ('aaron-seton', '30', 'Aaron Seton', 'Matt Stone Racing', 'F', 27, 98, 0, 0, false),
  ('todd-hazelwood', '17', 'Todd Hazelwood', 'Dick Johnson Racing', 'F', 28, 48, 0, 0, false),
  ('reuben-goodall', '5', 'Reuben Goodall', 'Tickford Racing', 'F', 29, 44, 0, 0, false),
  ('mark-winterbottom', '6', 'Mark Winterbottom', 'Tickford Racing', 'F', 30, 21, 0, 0, false),
  ('craig-lowndes', '15', 'Craig Lowndes', 'Team 18', 'F', 31, 0, 0, 0, true),
  ('james-moffat', '34', 'James Moffat', 'Garry Rogers Motorsport', 'F', 32, 0, 0, 0, true)
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

-- Make only the Bathurst field selectable:
-- 24 regular drivers + Craig Lowndes + James Moffat.
update public.drivers
set is_active = case
  when slug in (
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
  'craig-lowndes',
  'james-moffat'
  ) then true
  when slug in (
  'aaron-seton',
  'todd-hazelwood',
  'ben-gomersall',
  'bayley-hall',
  'reuben-goodall',
  'mark-winterbottom'
  ) then false
  else is_active
end
where slug in (
  'matthew-payne',
  'broc-feeney',
  'kai-allen',
  'brodie-kostecki',
  'cam-waters',
  'anton-de-pasquale',
  'will-brown',
  'chaz-mostert',
  'ryan-wood',
  'jack-le-brocq',
  'andre-heimgartner',
  'thomas-randle',
  'jayden-ojeda',
  'james-golding',
  'david-reynolds',
  'cameron-hill',
  'rylan-gray',
  'zach-bates',
  'cooper-murray',
  'aaron-cameron',
  'declan-fraser',
  'macauley-jones',
  'jackson-walls',
  'jobe-stewart',
  'bayley-hall',
  'ben-gomersall',
  'aaron-seton',
  'todd-hazelwood',
  'reuben-goodall',
  'mark-winterbottom',
  'craig-lowndes',
  'james-moffat'
);

-- Open Bathurst and close completed rounds.
update public.events
set is_open_event = false
where slug <> 'bathurst';

update public.events
set
  is_open_event = true,
  manual_lock = false,
  number_of_races = 1,
  event_multiplier = 2
where slug = 'bathurst';

update public.events
set
  is_open_event = false,
  manual_lock = true
where slug in ('perth', 'ipswich', 'the-bend');

-- Refresh driver card "last round fantasy points" from the updated The Bend result.
with bend_event as (
  select id from public.events where slug = 'the-bend' limit 1
),
bend_driver_scores as (
  select
    rr.driver_id,
    round(avg(rr.race_fantasy_points)::numeric, 1) as last_points
  from public.race_results rr
  join bend_event be on be.id = rr.event_id
  group by rr.driver_id
)
update public.drivers d
set last_round_fantasy_points = bds.last_points
from bend_driver_scores bds
where bds.driver_id = d.id;

-- If anyone picked Ben Gomersall for Bathurst while he was still available,
-- remove that invalid pick and clear C/VC if needed.
with bathurst_event as (
  select id from public.events where slug = 'bathurst' limit 1
),
ben_driver as (
  select id from public.drivers where slug = 'ben-gomersall' limit 1
),
invalid_teams as (
  select ft.id as fantasy_team_id
  from public.fantasy_teams ft
  join bathurst_event be on be.id = ft.event_id
  join public.fantasy_team_picks ftp on ftp.fantasy_team_id = ft.id
  join ben_driver bd on bd.id = ftp.driver_id
)
delete from public.fantasy_team_picks ftp
using invalid_teams it
where ftp.fantasy_team_id = it.fantasy_team_id
  and ftp.driver_id = (select id from ben_driver);

with bathurst_event as (
  select id from public.events where slug = 'bathurst' limit 1
),
ben_driver as (
  select id from public.drivers where slug = 'ben-gomersall' limit 1
)
update public.fantasy_teams ft
set
  captain_driver_id = case when ft.captain_driver_id = (select id from ben_driver) then null else ft.captain_driver_id end,
  vice_captain_driver_id = case when ft.vice_captain_driver_id = (select id from ben_driver) then null else ft.vice_captain_driver_id end,
  status = case when ft.status = 'scored' then 'saved' else ft.status end
where ft.event_id = (select id from bathurst_event)
  and (
    ft.captain_driver_id = (select id from ben_driver)
    or ft.vice_captain_driver_id = (select id from ben_driver)
  );

-- Checks.
select
  rr.race_number,
  count(*) as rows_saved,
  count(*) filter (where rr.finish_position is not null or rr.classification <> 'finished') as finish_rows_saved,
  round(sum(rr.race_fantasy_points)::numeric, 1) as total_driver_fantasy_points
from public.race_results rr
join public.events e on e.id = rr.event_id
where e.slug = 'the-bend'
  and rr.race_number = 1
group by rr.race_number;

select
  d.car_number,
  d.driver_name,
  rr.qualifying_position,
  rr.finish_position,
  rr.classification,
  rr.race_fantasy_points
from public.race_results rr
join public.events e on e.id = rr.event_id
join public.drivers d on d.id = rr.driver_id
where e.slug = 'the-bend'
  and rr.race_number = 1
order by rr.finish_position nulls last, d.driver_name;

select
  slug,
  name,
  is_open_event,
  manual_lock,
  number_of_races,
  event_multiplier,
  lockout_at
from public.events
where slug in ('the-bend', 'bathurst')
order by sort_order;

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
  is_active
from public.drivers
where slug in (
  'matthew-payne',
  'broc-feeney',
  'kai-allen',
  'brodie-kostecki',
  'cam-waters',
  'anton-de-pasquale',
  'will-brown',
  'chaz-mostert',
  'ryan-wood',
  'jack-le-brocq',
  'andre-heimgartner',
  'thomas-randle',
  'jayden-ojeda',
  'james-golding',
  'david-reynolds',
  'cameron-hill',
  'rylan-gray',
  'zach-bates',
  'cooper-murray',
  'aaron-cameron',
  'declan-fraser',
  'macauley-jones',
  'jackson-walls',
  'jobe-stewart',
  'bayley-hall',
  'ben-gomersall',
  'aaron-seton',
  'todd-hazelwood',
  'reuben-goodall',
  'mark-winterbottom',
  'craig-lowndes',
  'james-moffat'
)
order by points_position;

select
  'Bathurst teams with Ben Gomersall still picked' as check_name,
  count(*) as remaining_invalid_picks
from public.fantasy_team_picks ftp
join public.fantasy_teams ft on ft.id = ftp.fantasy_team_id
join public.events e on e.id = ft.event_id
join public.drivers d on d.id = ftp.driver_id
where e.slug = 'bathurst'
  and d.slug = 'ben-gomersall';
