-- V8 Race Fantasy feature update.
-- Run this once in Supabase SQL Editor after deploying this version.
-- It updates the remaining 2026 rounds to simple location names and refreshes the 24 active drivers/categories.


-- Stop a captain being saved as the vice-captain at database level too.
update public.fantasy_teams
set vice_captain_driver_id = null
where captain_driver_id is not null
  and captain_driver_id = vice_captain_driver_id;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'fantasy_teams_captain_not_vice'
  ) then
    alter table public.fantasy_teams
    add constraint fantasy_teams_captain_not_vice
    check (
      captain_driver_id is null
      or vice_captain_driver_id is null
      or captain_driver_id <> vice_captain_driver_id
    );
  end if;
end $$;

-- Keep only one open round.
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
  ('perth', 'Perth', 'Perth', '2026-07-31T09:00:00+08:00', false, true, 3, 1, 1),
  ('ipswich', 'Ipswich', 'Ipswich', '2026-08-21T09:00:00+10:00', false, false, 3, 1, 2),
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

insert into public.drivers (
  slug,
  car_number,
  driver_name,
  team_name,
  category,
  points_position,
  championship_points,
  wins,
  is_active
)
values
  ('matthew-payne', '19', 'Matthew Payne', 'Penrite Racing', 'A', 1, 1656, 3, true),
  ('broc-feeney', '88', 'Broc Feeney', 'Red Bull Ampol Racing', 'A', 2, 1564, 4, true),
  ('brodie-kostecki', '17', 'Brodie Kostecki', 'Shell V-Power Racing Team', 'A', 3, 1469, 6, true),
  ('cam-waters', '6', 'Cam Waters', 'Monster Castrol Racing', 'A', 4, 1461, 2, true),

  ('kai-allen', '26', 'Kai Allen', 'Penrite Racing', 'B', 5, 1339, 2, true),
  ('anton-de-pasquale', '18', 'Anton De Pasquale', 'DEWALT Racing', 'B', 6, 1314, 2, true),
  ('will-brown', '888', 'Will Brown', 'Red Bull Ampol Racing', 'B', 7, 1239, 0, true),
  ('ryan-wood', '2', 'Ryan Wood', 'Mobil1 Truck Assist Racing', 'B', 8, 1116, 1, true),

  ('chaz-mostert', '1', 'Chaz Mostert', 'Mobil1 Optus Racing', 'C', 9, 1092, 1, true),
  ('jack-le-brocq', '4', 'Jack Le Brocq', 'Sherrin Rentals Racing', 'C', 10, 987, 0, true),
  ('james-golding', '7', 'James Golding', 'CoolDrive Racing', 'C', 11, 976, 0, true),
  ('jayden-ojeda', '31', 'Jayden Ojeda', 'PremiAir Racing', 'C', 12, 850, 0, true),

  ('thomas-randle', '55', 'Thomas Randle', 'Monster Castrol Racing', 'D', 13, 831, 0, true),
  ('andre-heimgartner', '8', 'Andre Heimgartner', 'R&J Batteries Racing', 'D', 14, 812, 1, true),
  ('david-reynolds', '20', 'David Reynolds', 'Snowy River Caravans Racing', 'D', 15, 757, 0, true),
  ('cameron-hill', '14', 'Cameron Hill', 'Brad Jones Racing', 'D', 16, 697, 0, true),

  ('zach-bates', '10', 'Zach Bates', 'Bendix Racing', 'E', 17, 605, 0, true),
  ('declan-fraser', '777', 'Declan Fraser', 'PremiAir Racing', 'E', 18, 557, 0, true),
  ('rylan-gray', '38', 'Rylan Gray', 'Shell V-Power Racing Team', 'E', 19, 543, 0, true),
  ('macauley-jones', '96', 'Macauley Jones', 'Brad Jones Racing', 'E', 20, 542, 0, true),

  ('aaron-cameron', '3', 'Aaron Cameron', 'LIQUI MOLY BLAHST Racing', 'F', 21, 516, 0, true),
  ('cooper-murray', '99', 'Cooper Murray', 'Erebus Motorsport', 'F', 22, 510, 0, true),
  ('jackson-walls', '11', 'Jackson Walls', 'Objective Racing', 'F', 23, 447, 0, true),
  ('jobe-stewart', '9', 'Jobe Stewart', 'Erebus Motorsport', 'F', 24, 422, 0, true)
on conflict (slug) do update set
  car_number = excluded.car_number,
  driver_name = excluded.driver_name,
  team_name = excluded.team_name,
  category = excluded.category,
  points_position = excluded.points_position,
  championship_points = excluded.championship_points,
  wins = excluded.wins,
  is_active = true;

update public.drivers
set is_active = false
where slug not in (
  'matthew-payne',
  'broc-feeney',
  'brodie-kostecki',
  'cam-waters',
  'kai-allen',
  'anton-de-pasquale',
  'will-brown',
  'ryan-wood',
  'chaz-mostert',
  'jack-le-brocq',
  'james-golding',
  'jayden-ojeda',
  'thomas-randle',
  'andre-heimgartner',
  'david-reynolds',
  'cameron-hill',
  'zach-bates',
  'declan-fraser',
  'rylan-gray',
  'macauley-jones',
  'aaron-cameron',
  'cooper-murray',
  'jackson-walls',
  'jobe-stewart'
);

select category, count(*) as drivers
from public.drivers
where is_active = true
group by category
order by category;

select points_position, car_number, driver_name, team_name, category, championship_points, wins
from public.drivers
where is_active = true
order by points_position;
