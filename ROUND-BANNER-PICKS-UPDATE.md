# V8 Race Fantasy round banner + picks update

Changes:
- Added a slim global top banner for logged-in users.
- Banner shows last round score, round rank, overall rank, next open round and lockout countdown.
- Banner prompts users to pick/edit their team for the upcoming round.
- Added `/round-picks` so users can see who selected who for each locked/scored round.
- Round picks protect strategy before lockout.
- Added Round Picks links to desktop nav, mobile nav, profile menu and leaderboard.
- Fixed the weird league join success/error issue by keeping the success message after a successful join refresh.
- Replaced the home page “Simple location names” section with the V8 Race Fantasy run home.

Run this SQL once:
`supabase/round-banner-picks-upgrade.sql`

Important:
- `/round-picks` shows saved teams after an event has locked.
- The top banner uses published fantasy scores, so Perth will appear once you have published/republished Perth scores in Race Control.
