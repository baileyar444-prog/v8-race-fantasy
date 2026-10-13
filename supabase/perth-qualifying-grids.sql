-- Perth qualifying / starting grids for V8 Race Fantasy.
-- Source: user-provided Perth V8 Supercars starting line-ups, Saturday 01 August 2026.
--
-- App mapping:
-- - Race 23 = Perth event race_number 1
-- - Race 24 = Perth event race_number 2
-- - Race 25 / race_number 3 is left blank until its grid/results are known.
--
-- Note: Brodie Kostecki, Jayden Ojeda, Zach Bates and Jobe Stewart were marked as
-- receiving two-place grid penalties for impeding during Race 23 qualifying.
-- The supplied Race 23 starting grid already reflects those grid positions.
-- No separate V8 Race Fantasy penalty is applied by this SQL.

with perth_event as (
  select id
  from public.events
  where slug = 'perth'
  limit 1
),
grid(driver_slug, race_number, qualifying_position) as (
  values
    -- Race 23 grid
    ('matthew-payne', 1, 1),
    ('cam-waters', 1, 2),
    ('thomas-randle', 1, 3),
    ('ryan-wood', 1, 4),
    ('kai-allen', 1, 5),
    ('andre-heimgartner', 1, 6),
    ('rylan-gray', 1, 7),
    ('brodie-kostecki', 1, 8),
    ('anton-de-pasquale', 1, 9),
    ('cameron-hill', 1, 10),
    ('chaz-mostert', 1, 11),
    ('will-brown', 1, 12),
    ('broc-feeney', 1, 13),
    ('macauley-jones', 1, 14),
    ('jack-le-brocq', 1, 15),
    ('jackson-walls', 1, 16),
    ('declan-fraser', 1, 17),
    ('david-reynolds', 1, 18),
    ('james-golding', 1, 19),
    ('cooper-murray', 1, 20),
    ('aaron-cameron', 1, 21),
    ('jayden-ojeda', 1, 22),
    ('zach-bates', 1, 23),
    ('jobe-stewart', 1, 24),

    -- Race 24 grid
    ('matthew-payne', 2, 1),
    ('broc-feeney', 2, 2),
    ('kai-allen', 2, 3),
    ('thomas-randle', 2, 4),
    ('chaz-mostert', 2, 5),
    ('andre-heimgartner', 2, 6),
    ('brodie-kostecki', 2, 7),
    ('cam-waters', 2, 8),
    ('rylan-gray', 2, 9),
    ('anton-de-pasquale', 2, 10),
    ('ryan-wood', 2, 11),
    ('will-brown', 2, 12),
    ('declan-fraser', 2, 13),
    ('james-golding', 2, 14),
    ('jack-le-brocq', 2, 15),
    ('jayden-ojeda', 2, 16),
    ('macauley-jones', 2, 17),
    ('david-reynolds', 2, 18),
    ('jobe-stewart', 2, 19),
    ('cameron-hill', 2, 20),
    ('jackson-walls', 2, 21),
    ('zach-bates', 2, 22),
    ('cooper-murray', 2, 23),
    ('aaron-cameron', 2, 24)
),
existing as (
  select rr.*
  from public.race_results rr
  join perth_event pe on pe.id = rr.event_id
  where rr.race_number in (1, 2)
),
prepared as (
  select
    pe.id as event_id,
    g.race_number,
    d.id as driver_id,
    g.qualifying_position,
    ex.finish_position,
    coalesce(ex.classification, 'finished') as classification,
    false as fastest_lap,
    'none' as penalty
  from grid g
  cross join perth_event pe
  join public.drivers d
    on d.slug = g.driver_slug
  left join existing ex
    on ex.race_number = g.race_number
   and ex.driver_id = d.id
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
    end as qualifying_points,
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
    end as finish_points
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
  (
    qualifying_points
    + finish_points
    + case when classification = 'dnf' then -10 when classification = 'dns' then -15 when classification = 'dsq' then -25 else 0 end
  )
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
  and rr.race_number in (1, 2)
order by rr.race_number, rr.qualifying_position;
