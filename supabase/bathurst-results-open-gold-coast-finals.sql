-- V8 Race Fantasy: Bathurst 1000 confirmed results + post-Bathurst standings + open Gold Coast Finals.
-- Run in Supabase SQL Editor.
--
-- Uses the supplied Bathurst starting grid and race result.
-- Fantasy scoring = qualifying points + finish points.
-- Fastest lap and penalty points are not used.
-- Bathurst remains a 2x fantasy EVENT multiplier when Race Control publishes the round.
--
-- Bathurst fantasy mappings for wildcard cars:
-- #15 Bayley Hall/Craig Lowndes -> craig-lowndes
-- #34 Nathan Herne/James Moffat -> james-moffat
--
-- Gold Coast:
-- 24 full-time drivers only
-- four drivers in every category A-F
-- Bathurst co-drivers/wildcards remain in history but are inactive for selection
-- Existing Gold Coast lockout_at is preserved.

alter table public.drivers
add column if not exists poles integer not null default 0,
add column if not exists last_round_fantasy_points numeric not null default 0;

insert into public.drivers (
  slug, car_number, driver_name, team_name, category,
  points_position, championship_points, wins, poles, is_active
)
values
  ('matthew-payne', '19', 'Matthew Payne', 'Penrite Racing', 'A', 1, 2490, 5, 7, true),
  ('broc-feeney', '88', 'Broc Feeney', 'Red Bull Ampol Racing', 'A', 2, 2285, 6, 4, true),
  ('brodie-kostecki', '17', 'Brodie Kostecki', 'Shell V-Power Racing Team', 'A', 3, 2271, 8, 6, true),
  ('will-brown', '888', 'Will Brown', 'Red Bull Ampol Racing', 'A', 4, 2146, 1, 2, true),
  ('kai-allen', '26', 'Kai Allen', 'Penrite Racing', 'B', 5, 2131, 2, 0, true),
  ('cam-waters', '6', 'Cameron Waters', 'Monster Castrol Racing', 'B', 6, 2055, 2, 3, true),
  ('anton-de-pasquale', '18', 'Anton De Pasquale', 'DEWALT Racing', 'B', 7, 1879, 2, 1, true),
  ('chaz-mostert', '1', 'Chaz Mostert', 'Mobil1 Optus Racing', 'B', 8, 1713, 2, 1, true),
  ('ryan-wood', '2', 'Ryan Wood', 'Mobil1 Truck Assist Racing', 'C', 9, 1638, 1, 2, true),
  ('jack-le-brocq', '4', 'Jack Le Brocq', 'Sherrin Rentals Racing', 'C', 10, 1547, 0, 0, true),
  ('andre-heimgartner', '8', 'Andre Heimgartner', 'R&J Batteries Racing', 'C', 11, 1423, 1, 1, true),
  ('thomas-randle', '55', 'Thomas Randle', 'Monster Castrol Racing', 'C', 12, 1404, 0, 0, true),
  ('james-golding', '7', 'James Golding', 'CoolDrive Racing', 'D', 13, 1393, 0, 1, true),
  ('jayden-ojeda', '31', 'Jayden Ojeda', 'PremiAir Racing', 'D', 14, 1363, 0, 0, true),
  ('david-reynolds', '48', 'David Reynolds', 'Snowy River Caravans Racing', 'D', 15, 1114, 0, 0, true),
  ('zach-bates', '10', 'Zach Bates', 'Bendix Racing', 'D', 16, 1069, 0, 1, true),
  ('cameron-hill', '14', 'Cameron Hill', 'Brad Jones Racing', 'E', 17, 1045, 0, 0, true),
  ('cooper-murray', '99', 'Cooper Murray', 'Erebus Motorsport', 'E', 18, 972, 0, 0, true),
  ('rylan-gray', '38', 'Rylan Gray', 'Shell V-Power Racing Team', 'E', 19, 968, 0, 0, true),
  ('aaron-cameron', '3', 'Aaron Cameron', 'LIQUI MOLY BLAHST Racing', 'E', 20, 873, 0, 0, true),
  ('declan-fraser', '777', 'Declan Fraser', 'PremiAir Racing', 'F', 21, 788, 0, 0, true),
  ('macauley-jones', '96', 'Macauley Jones', 'Brad Jones Racing', 'F', 22, 767, 0, 0, true),
  ('jobe-stewart', '9', 'Jobe Stewart', 'Erebus Motorsport', 'F', 23, 725, 0, 0, true),
  ('jackson-walls', '11', 'Jackson Walls', 'Objective Racing', 'F', 24, 711, 0, 0, true),
  ('todd-hazelwood', '17', 'Todd Hazelwood', 'Shell V-Power Racing Team', 'F', 25, 441, 1, 0, false),
  ('aaron-seton', '10', 'Aaron Seton', 'Bendix Racing', 'F', 26, 438, 0, 0, false),
  ('reuben-goodall', '55', 'Reuben Goodall', 'Monster Castrol Racing', 'F', 27, 328, 0, 0, false),
  ('bayley-hall', '15', 'Bayley Hall', 'Supercheap Auto Racing', 'F', 28, 309, 0, 0, false),
  ('craig-lowndes', '15', 'Craig Lowndes', 'Supercheap Auto Racing', 'F', 29, 262, 0, 0, false),
  ('mark-winterbottom', '6', 'Mark Winterbottom', 'Monster Castrol Racing', 'F', 30, 224, 0, 0, false),
  ('ben-gomersall', '5', 'Ben Gomersall', 'Tickford Autosport', 'F', 31, 105, 0, 0, false),
  ('james-moffat', '34', 'James Moffat', 'Garry Rogers Motorsport', 'F', 32, 67, 0, 0, false)
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

with bathurst_event as (
  select id from public.events where slug = 'bathurst' limit 1
),
bathurst_result(driver_slug, qualifying_position, finish_position, classification_text) as (
  values
    ('brodie-kostecki', 2, 1, 'finished'),
    ('will-brown', 6, 2, 'finished'),
    ('zach-bates', 1, 3, 'finished'),
    ('jack-le-brocq', 5, 4, 'finished'),
    ('matthew-payne', 10, 5, 'finished'),
    ('cooper-murray', 4, 6, 'finished'),
    ('andre-heimgartner', 15, 7, 'finished'),
    ('james-golding', 9, 8, 'finished'),
    ('thomas-randle', 13, 9, 'finished'),
    ('craig-lowndes', 22, 10, 'finished'),
    ('broc-feeney', 12, 11, 'finished'),
    ('jayden-ojeda', 7, 12, 'finished'),
    ('aaron-cameron', 18, 13, 'finished'),
    ('cameron-hill', 19, 14, 'finished'),
    ('cam-waters', 14, 15, 'finished'),
    ('jobe-stewart', 17, 16, 'finished'),
    ('david-reynolds', 8, 17, 'finished'),
    ('declan-fraser', 23, 18, 'finished'),
    ('james-moffat', 21, 19, 'finished'),
    ('kai-allen', 11, 20, 'finished'),
    ('macauley-jones', 20, 21, 'finished'),
    ('rylan-gray', 25, 22, 'finished'),
    ('jackson-walls', 24, 23, 'finished'),
    ('ryan-wood', 26, 24, 'finished'),
    ('chaz-mostert', 16, 25, 'finished'),
    ('anton-de-pasquale', 3, 26, 'finished')
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
    end as race_fantasy_points
  from bathurst_result r
  cross join bathurst_event be
  join public.drivers d on d.slug = r.driver_slug
)
insert into public.race_results (
  event_id, race_number, driver_id, qualifying_position, finish_position,
  classification, fastest_lap, penalty, race_fantasy_points
)
select
  event_id, race_number, driver_id, qualifying_position, finish_position,
  classification, fastest_lap, penalty, race_fantasy_points
from scored
on conflict (event_id, race_number, driver_id)
do update set
  qualifying_position = excluded.qualifying_position,
  finish_position = excluded.finish_position,
  classification = excluded.classification,
  fastest_lap = excluded.fastest_lap,
  penalty = excluded.penalty,
  race_fantasy_points = excluded.race_fantasy_points;

with bathurst_event as (
  select id from public.events where slug = 'bathurst' limit 1
),
bathurst_scores as (
  select rr.driver_id, round(avg(rr.race_fantasy_points)::numeric, 1) as last_points
  from public.race_results rr
  join bathurst_event be on be.id = rr.event_id
  group by rr.driver_id
)
update public.drivers d
set last_round_fantasy_points = bs.last_points
from bathurst_scores bs
where d.id = bs.driver_id;

update public.events
set is_open_event = false
where slug <> 'gold-coast';

update public.events
set
  is_open_event = false,
  manual_lock = true,
  number_of_races = 1,
  event_multiplier = 2
where slug = 'bathurst';

update public.events
set
  is_open_event = true,
  manual_lock = false,
  number_of_races = 2,
  event_multiplier = 1
where slug = 'gold-coast';

update public.drivers
set is_active = true
where slug in ('matthew-payne', 'broc-feeney', 'brodie-kostecki', 'will-brown', 'kai-allen', 'cam-waters', 'anton-de-pasquale', 'chaz-mostert', 'ryan-wood', 'jack-le-brocq', 'andre-heimgartner', 'thomas-randle', 'james-golding', 'jayden-ojeda', 'david-reynolds', 'zach-bates', 'cameron-hill', 'cooper-murray', 'rylan-gray', 'aaron-cameron', 'declan-fraser', 'macauley-jones', 'jobe-stewart', 'jackson-walls');

update public.drivers
set is_active = false
where slug in ('todd-hazelwood', 'aaron-seton', 'reuben-goodall', 'bayley-hall', 'craig-lowndes', 'mark-winterbottom', 'ben-gomersall', 'james-moffat');

with gold_coast as (
  select id from public.events where slug = 'gold-coast' limit 1
)
delete from public.fantasy_team_picks ftp
using public.fantasy_teams ft, public.drivers d, gold_coast gc
where ftp.fantasy_team_id = ft.id
  and ftp.driver_id = d.id
  and ft.event_id = gc.id
  and (d.is_active = false or ftp.category <> d.category);

with gold_coast as (
  select id from public.events where slug = 'gold-coast' limit 1
)
update public.fantasy_teams ft
set
  captain_driver_id = case
    when captain_driver_id is not null
      and not exists (
        select 1
        from public.fantasy_team_picks ftp
        where ftp.fantasy_team_id = ft.id
          and ftp.driver_id = ft.captain_driver_id
      )
    then null else captain_driver_id end,
  vice_captain_driver_id = case
    when vice_captain_driver_id is not null
      and not exists (
        select 1
        from public.fantasy_team_picks ftp
        where ftp.fantasy_team_id = ft.id
          and ftp.driver_id = ft.vice_captain_driver_id
      )
    then null else vice_captain_driver_id end
where ft.event_id = (select id from gold_coast);

-- CHECK 1: Bathurst should have 26 rows and 706 total raw driver fantasy points.
select
  rr.race_number,
  count(*) as rows_saved,
  round(sum(rr.race_fantasy_points)::numeric, 1) as total_driver_fantasy_points
from public.race_results rr
join public.events e on e.id = rr.event_id
where e.slug = 'bathurst'
group by rr.race_number
order by rr.race_number;

-- CHECK 2: Full Bathurst result and fantasy points.
select
  d.car_number, d.driver_name, rr.qualifying_position, rr.finish_position,
  rr.classification, rr.race_fantasy_points
from public.race_results rr
join public.events e on e.id = rr.event_id
join public.drivers d on d.id = rr.driver_id
where e.slug = 'bathurst' and rr.race_number = 1
order by rr.finish_position;

-- CHECK 3: Gold Coast should be open, 2 races, 1x event multiplier.
select
  slug, name, is_open_event, manual_lock, number_of_races, event_multiplier, lockout_at
from public.events
where slug in ('bathurst', 'gold-coast')
order by sort_order;

-- CHECK 4: exactly 24 active drivers, four in every category A-F.
select category, count(*) as active_drivers
from public.drivers
where is_active = true
group by category
order by category;

-- CHECK 5: post-Bathurst standings used for Gold Coast reclassification.
select
  points_position, car_number, driver_name, team_name, category,
  championship_points, wins, poles, is_active
from public.drivers
order by points_position;
