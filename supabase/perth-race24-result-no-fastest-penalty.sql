-- Perth Race 24 result for V8 Race Fantasy.
-- This is Perth Race 2 in the app, so race_number = 2.
-- Source: user-provided Perth Race 24 result.
--
-- Current scoring rule:
-- Points = qualifying points + race finish points + classification only.
-- Fastest lap and racing penalty points are NOT used.
-- All cars are treated as classified/finished from the supplied result.

with perth_event as (
  select id
  from public.events
  where slug = 'perth'
  limit 1
),
race24(driver_slug, qualifying_position, finish_position) as (
  values
    ('broc-feeney', 2, 1),
    ('matthew-payne', 1, 2),
    ('kai-allen', 3, 3),
    ('chaz-mostert', 5, 4),
    ('will-brown', 12, 5),
    ('brodie-kostecki', 7, 6),
    ('andre-heimgartner', 6, 7),
    ('ryan-wood', 11, 8),
    ('cam-waters', 8, 9),
    ('thomas-randle', 4, 10),
    ('anton-de-pasquale', 10, 11),
    ('declan-fraser', 13, 12),
    ('jack-le-brocq', 15, 13),
    ('james-golding', 14, 14),
    ('david-reynolds', 18, 15),
    ('jobe-stewart', 19, 16),
    ('rylan-gray', 9, 17),
    ('jayden-ojeda', 16, 18),
    ('cooper-murray', 23, 19),
    ('cameron-hill', 20, 20),
    ('aaron-cameron', 24, 21),
    ('zach-bates', 22, 22),
    ('macauley-jones', 17, 23),
    ('jackson-walls', 21, 24)
),
scored as (
  select
    pe.id as event_id,
    2 as race_number,
    d.id as driver_id,
    r.qualifying_position,
    r.finish_position,
    'finished'::classification_status as classification,
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
      else 0
    end as race_fantasy_points
  from race24 r
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
  and rr.race_number = 2
order by rr.finish_position;
