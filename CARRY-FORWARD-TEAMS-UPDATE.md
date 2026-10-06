# V8 Race Fantasy carry-forward teams update

Changes:
- Round Preview now shows registered players instead of saved teams.
- Race Control now prepares a locked event before publishing scores.
- If an account has no current-round team but has a previous team, the latest previous team is carried forward.
- If a carried-forward driver is no longer in the same category, that category is left blank and shown as N/A.
- Carried-forward teams are visible on leaderboard team view with a note such as “Continued from Perth”.
- Carried-forward teams score with fewer drivers if one or more categories are blank.
- If an account has no previous team at all, they receive the 150 baseline score after lockout.
- Admin Stats now shows saved teams for the open round, already continued teams, pending carry-forwards, pending baselines, and a list of logged-in users who have not saved the upcoming round.
- New manually saved teams clear any carry-forward metadata.

Run this SQL once:
`supabase/carry-forward-teams-upgrade.sql`

After running the SQL and deploying, publish or republish the locked event in Race Control. Race Control will apply carry-forwards first, then baseline scores.
