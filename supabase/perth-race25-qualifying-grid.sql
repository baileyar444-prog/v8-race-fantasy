-- Perth Race 25 qualifying grid for V8 Race Fantasy.
-- This is Perth Race 3 in the app, so race_number = 3.
-- Source: user-provided Perth Race 25 qualifying result.
--
-- Current scoring rule:
-- Points = qualifying points + race finish points + classification only.
-- Fastest lap and racing penalty points are NOT used.
--
-- This SQL loads qualifying/grid positions only.
-- If Race 25 finish positions already exist, they are preserved and points are recalculated.
-- If finish positions are not in yet, Race 25 points will be qualifying-only until you enter the race result.

with perth_event as (
  select id
  from public.events
  where slug = 'perth'
  limit 1
),
race25_grid(driver_slug, qualifying_position) as (
  values
    ('broc-feeney', 1),
    ('cam-waters', 2),
    ('matthew-payne', 3),
    ('ryan-wood', 4),
    ('brodie-kostecki', 5),
    ('anton-de-pasquale', 6),
    ('james-golding', 7),
    ('thomas-randle', 8),
    ('aaron-cameron', 9),
    ('david-reynolds', 10),
    ('andre-heimgartner', 11),
    ('chaz-mostert', 12),
    ('jack-le-brocq', 13),
    ('cameron-hill', 14),
    ('macauley-jones', 15),
    ('rylan-gray', 16),
    ('cooper-murray', 17),
    ('jobe-stewart', 18),
    ('will-brown', 19),
    ('jayden-ojeda', 20),
    ('jackson-walls', 21),
    ('declan-fraser', 22),
    ('kai-allen', 23),
    ('zach-bates', 24)
),
existing as (
  select rr.*
  from public.race_results rr
  join perth_event pe on pe.id = rr.event_id
  where rr.race_number = 3
),
prepared as (
  select
    pe.id as event_id,
    3 as race_number,
    d.id as driver_id,
    g.qualifying_position,
    ex.finish_position,
    coalesce(ex.classification, 'finished'::classification_status) as classification,
    false as fastest_lap,
    'none'::penalty_type as penalty
  from race25_grid g
  cross join perth_event pe
  join public.drivers d
    on d.slug = g.driver_slug
  left join existing ex
    on ex.driver_id = d.id
),
scored as (
  select
    *,
    case
      when classification in ('dns', 'dsq') then 0
      when qualifying_position = 1 then 20
      when qualifying_position = 2 then 17
      when qualifying_position = 3 then 15
      when qualifying_position = 4 then 13
      when qualifying_position = 5 then 11
      when qualifying_position between 6 and 10 then 16 - qualifying_position
      when qualifying_position between 11 and 15 then 16 - qualifying_position
      else 0
    end
    +
    case
      when classification in ('dns', 'dsq') then 0
      when finish_position = 1 then 60
      when finish_position = 2 then 54
      when finish_position = 3 then 49
      when finish_position = 4 then 45
      when finish_position = 5 then 41
      when finish_position = 6 then 38
      when finish_position = 7 then 35
      when finish_position = 8 then 32
      when finish_position = 9 then 29
      when finish_position = 10 then 26
      when finish_position = 11 then 24
      when finish_position = 12 then 22
      when finish_position = 13 then 20
      when finish_position = 14 then 18
      when finish_position = 15 then 16
      when finish_position = 16 then 14
      when finish_position = 17 then 12
      when finish_position = 18 then 10
      when finish_position = 19 then 8
      when finish_position = 20 then 6
      when finish_position = 21 then 5
      when finish_position = 22 then 4
      when finish_position = 23 then 3
      when finish_position = 24 then 2
      else 0
    end
    + case
        when classification = 'dnf' then -10
        when classification = 'dns' then -15
        when classification = 'dsq' then -25
        else 0
      end as race_fantasy_points
  from prepared
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
  and rr.race_number = 3
order by rr.qualifying_position;
