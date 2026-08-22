# V8 Race Fantasy leaderboard team-view update

Changes:
- Removed the separate Round Picks page from navigation and the app route.
- Removed the Rules page from navigation and the app route, because the rules are already explained on the home page.
- Added a View team button directly on the leaderboard table.
- The same leaderboard page works for overall ladders, event ladders and league ladders.
- Clicking View team expands that manager's A-F selections under their row.
- Captain and vice-captain are marked with C and VC.
- Current round picks remain hidden until lockout unless the user is viewing their own team.
- The top banner now links to the Leaderboard instead of a separate Picks page.

Run this SQL once:
`supabase/leaderboard-team-view-upgrade.sql`
