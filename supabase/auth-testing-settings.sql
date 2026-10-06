-- Optional helper to inspect data after testing.
-- This does NOT turn off email confirmation. That is a Supabase dashboard setting.
-- Optional Supabase auth testing helper.

select id, email, display_name, garage_name, role
from public.profiles
order by created_at desc;

select *
from public.fantasy_teams
order by submitted_at desc;

select *
from public.fantasy_team_picks
order by id desc;
