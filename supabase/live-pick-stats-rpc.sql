-- V8 Race Fantasy: live aggregate pick stats
-- This exposes ONLY aggregate counts/percentages for the selected event.
-- It does not expose individual users' teams before lockout.

create or replace function public.get_event_driver_pick_stats(target_event_id uuid)
returns table (
  driver_id uuid,
  picked_count bigint,
  captain_count bigint,
  vice_count bigint,
  team_count bigint,
  picked_percent numeric,
  captain_percent numeric,
  vice_percent numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with event_teams as (
    select
      ft.id,
      ft.captain_driver_id,
      ft.vice_captain_driver_id
    from public.fantasy_teams ft
    where ft.event_id = target_event_id
  ),
  team_total as (
    select count(*)::bigint as team_count
    from event_teams
  ),
  counts as (
    select
      ftp.driver_id,
      count(distinct ftp.fantasy_team_id)::bigint as picked_count,
      count(distinct ftp.fantasy_team_id) filter (
        where et.captain_driver_id = ftp.driver_id
      )::bigint as captain_count,
      count(distinct ftp.fantasy_team_id) filter (
        where et.vice_captain_driver_id = ftp.driver_id
      )::bigint as vice_count
    from public.fantasy_team_picks ftp
    join event_teams et
      on et.id = ftp.fantasy_team_id
    group by ftp.driver_id
  )
  select
    d.id as driver_id,
    coalesce(c.picked_count, 0)::bigint as picked_count,
    coalesce(c.captain_count, 0)::bigint as captain_count,
    coalesce(c.vice_count, 0)::bigint as vice_count,
    tt.team_count,
    case
      when tt.team_count > 0 then round((coalesce(c.picked_count, 0)::numeric / tt.team_count::numeric) * 100, 1)
      else 0::numeric
    end as picked_percent,
    case
      when tt.team_count > 0 then round((coalesce(c.captain_count, 0)::numeric / tt.team_count::numeric) * 100, 1)
      else 0::numeric
    end as captain_percent,
    case
      when tt.team_count > 0 then round((coalesce(c.vice_count, 0)::numeric / tt.team_count::numeric) * 100, 1)
      else 0::numeric
    end as vice_percent
  from public.drivers d
  cross join team_total tt
  left join counts c
    on c.driver_id = d.id
  where d.is_active = true
  order by d.points_position nulls last, d.driver_name;
$$;

revoke all on function public.get_event_driver_pick_stats(uuid) from public;
grant execute on function public.get_event_driver_pick_stats(uuid) to anon, authenticated;

-- Optional check for the currently open event.
select *
from public.get_event_driver_pick_stats(
  (select id from public.events where is_open_event = true order by sort_order desc limit 1)
);
