-- Helpful checks for the leaderboard/leagues version.

select 'profiles' as table_name, count(*) from public.profiles
union all
select 'fantasy_teams' as table_name, count(*) from public.fantasy_teams
union all
select 'fantasy_team_picks' as table_name, count(*) from public.fantasy_team_picks
union all
select 'leagues' as table_name, count(*) from public.leagues
union all
select 'league_members' as table_name, count(*) from public.league_members
union all
select 'fantasy_scores' as table_name, count(*) from public.fantasy_scores;

select
  p.garage_name,
  p.display_name,
  e.full_name as event_name,
  ft.submitted_at
from public.fantasy_teams ft
join public.profiles p on p.id = ft.user_id
join public.events e on e.id = ft.event_id
order by ft.submitted_at desc;

select
  l.name,
  l.share_code,
  count(lm.user_id) as members
from public.leagues l
left join public.league_members lm on lm.league_id = l.id
group by l.id
order by l.created_at desc;
