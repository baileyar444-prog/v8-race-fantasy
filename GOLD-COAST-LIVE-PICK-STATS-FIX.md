# Gold Coast live pick stats fix

## Problem
The public/live pick percentage UI was reading `fantasy_teams` and `fantasy_team_picks` directly. Before lockout, RLS intentionally limits those tables to a user's own team (or admin access), so aggregate ownership could incorrectly display as 0.0% or otherwise incomplete.

## Fix
- Adds `public.get_event_driver_pick_stats(uuid)` as a SECURITY DEFINER aggregate RPC.
- The RPC returns only aggregate driver counts/percentages and total saved-team count; it does not expose individual managers' teams.
- Drivers, Home Dashboard, Pick Team and Round Preview now use the same aggregate source for the current open event.
- Historical locked-round statistics can continue using normal table reads.
- When there are genuinely no saved teams, the UI no longer names an arbitrary 0.0% driver as the most/least picked.

## Deployment
1. Run `supabase/live-pick-stats-rpc.sql` in Supabase SQL Editor.
2. Deploy the website project.
3. Hard-refresh the site and verify the Gold Coast Drivers / Round Preview / Pick Team percentages.
