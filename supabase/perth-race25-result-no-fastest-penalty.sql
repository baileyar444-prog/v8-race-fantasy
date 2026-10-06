-- Perth Race 25 result for V8 Race Fantasy.
-- This is Perth Race 3 in the app, so race_number = 3.
-- Source: user-provided Perth Race 25 / Perth Race 3 result.
--
-- Current scoring rule:
-- Points = qualifying points + race finish points + classification only.
-- Fastest lap and racing penalty points are NOT used.
--
-- Note:
-- The supplied result skipped P19 and repeated P21.
-- This SQL follows the finishing order shown and uses:
-- P19 Cameron Hill, P20 Jackson Walls, P21 Macauley Jones, P22 Zach Bates, P23 Rylan Gray.
-- Ryan Wood is recorded as DNS.

with perth_event as (
  select id
  from public.events
  where slug = 'perth'
  limit 1
),
race25(driver_slug, qualifying_position, finish_position, classification_text) as (
  values
    ('matthew-payne', 3, 1, 'finished'),
    ('broc-feeney', 1, 2, 'finished'),
    ('anton-de-pasquale', 6, 3, 'finished'),
    ('cam-waters', 2, 4, 'finished'),
    ('kai-allen', 23, 5, 'finished'),
    ('chaz-mostert', 12, 6, 'finished'),
    ('aaron-cameron', 9, 7, 'finished'),
    ('jayden-ojeda', 20, 8, 'finished'),
    ('david-reynolds', 10, 9, 'finished'),
    ('thomas-randle', 8, 10, 'finished'),
    ('andre-heimgartner', 11, 11, 'finished'),
    ('brodie-kostecki', 5, 12, 'finished'),
    ('cooper-murray', 17, 13, 'finished'),
    ('james-golding', 7, 14, 'finished'),
    ('jack-le-brocq', 13, 15, 'finished'),
    ('declan-fraser', 22, 16, 'finished'),
    ('will-brown', 19, 17, 'finished'),
    ('jobe-stewart', 18, 18, 'finished'),
    ('cameron-hill', 14, 19, 'finished'),
    ('jackson-walls', 21, 20, 'finished'),
    ('macauley-jones', 15, 21, 'finished'),
    ('zach-bates', 24, 22, 'finished'),
    ('rylan-gray', 16, 23, 'finished'),
    ('ryan-wood', 4, null, 'dns')
),
scored as (
  select
    pe.id as event_id,
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
      else 0
    end
    + case
        when r.classification_text = 'dnf' then -10
        when r.classification_text = 'dns' then -15
        when r.classification_text = 'dsq' then -25
        else 0
      end as race_fantasy_points
  from race25 r
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
  rr.classification,
  rr.race_fantasy_points
from public.race_results rr
join public.events e on e.id = rr.event_id
join public.drivers d on d.id = rr.driver_id
where e.slug = 'perth'
  and rr.race_number = 3
order by
  case when rr.classification = 'dns' then 999 else coalesce(rr.finish_position, 998) end;
