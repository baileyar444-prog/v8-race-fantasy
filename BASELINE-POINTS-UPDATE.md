# V8 Race Fantasy missed-team baseline points update

New rule:
- If an account does not enter a team for a locked round, they receive 150 points.

How it works:
- Race Control now refuses to publish scores before the selected event is locked.
- When Race Control publishes or republishes a locked event:
  - saved teams are scored normally
  - accounts without a saved team for that event receive a 150-point baseline score
  - baseline rows are saved in `fantasy_scores` with `status = 'baseline'`
- Leaderboard shows baseline users as `Baseline 150`.
- My Team history explains when a baseline score was applied.
- Admin Stats shows how many missed-team baseline scores have been published.

Run this SQL once:
`supabase/baseline-points-upgrade.sql`

For Perth:
- If Perth has already been published, running the SQL will backfill 150-point baseline scores for accounts that missed Perth.
- You can also republish Perth in Race Control after deploying this update.
