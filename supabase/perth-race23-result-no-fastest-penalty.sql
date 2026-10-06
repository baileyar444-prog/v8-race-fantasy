-- Perth Race 23 result + updated V8 Race Fantasy scoring.
-- Source: user-provided Race 23 result, Saturday 01 August 2026.
--
-- This updates Perth race_number 1, which represents Race 23 in the app.
-- Fastest lap and penalty points are no longer used.
-- Points = qualifying points + finishing points + classification only.
-- All fastest_lap flags are set to false and penalty values to none for this race.

with perth_event as (
  select id
  from public.events
  where slug = 'perth'
  limit 1
),
race23(driver_slug, qualifying_position, finish_position) as (
  values
    ('matthew-payne', 1, 1),
    ('ryan-wood', 4, 2),
    ('anton-de-pasquale', 9, 3),
    ('cam-waters', 2, 4),
    ('chaz-mostert', 11, 5),
    ('kai-allen', 5, 6),
    ('broc-feeney', 13, 7),
    ('andre-heimgartner', 6, 8),
    ('thomas-randle', 3, 9),
    ('rylan-gray', 7, 10),
    ('jack-le-brocq', 15, 11),
    ('will-brown', 12, 12),
    ('cooper-murray', 20, 13),
    ('cameron-hill', 10, 14),
    ('james-golding', 19, 15),
    ('aaron-cameron', 21, 16),
    ('jackson-walls', 16, 17),
    ('jobe-stewart', 24, 18),
    ('david-reynolds', 18, 19),
    ('jayden-ojeda', 22, 20),
    ('declan-fraser', 17, 21),
    ('zach-bates', 23, 22),
    ('macauley-jones', 14, 23),
    ('brodie-kostecki', 8, 24)
),
scored as (
  select
    pe.id as event_id,
    1 as race_number,
    d.id as driver_id,
    r.qualifying_position,
    r.finish_position,
    'finished'::text as classification,
    false as fastest_lap,
    'none'::text as penalty,
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
      else 0
    end as race_fantasy_points
  from race23 r
  cross join perth_event pe
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

select
  rr.race_number,
  d.car_number,
  d.driver_name,
  rr.qualifying_position,
  rr.finish_position,
  rr.race_fantasy_points
from public.race_results rr
join public.events e on e.id = rr.event_id
join public.drivers d on d.id = rr.driver_id
where e.slug = 'perth'
  and rr.race_number = 1
order by rr.finish_position;
