# V8 Race Fantasy drivers page + merged home update

Changes:
- Start page has been merged into the home page.
- The route `/get-started` now sends users back to `/`.
- Desktop navigation removes Start and adds Drivers.
- Mobile bottom navigation removes Start and adds Drivers.
- Home page now includes the quick-start actions:
  - create account
  - pick team
  - join GRID88
  - create/join leagues
  - share team
  - open driver stats
- Added new `/drivers` page.
- Drivers page shows:
  - current driver category and championship position/points
  - active or historical status
  - total fantasy points from race results
  - last round fantasy points
  - per-event category
  - picked percentage by event
  - captaincy percentage by event
  - vice-captaincy percentage by event
  - race-by-race qualifying points, race points and total fantasy points
- Fallback/default event is now The Bend open, not Ipswich.
- Fallback/default driver list is updated to post-Ipswich standings for The Bend.
- The Bend fallback field is 26 drivers:
  - 24 regular cars
  - #5 Ben Gomersall
  - #15 Craig Lowndes
- The home run-home section now excludes Perth and Ipswich.
- Race Control quick setup copy now points to The Bend.

No new Supabase SQL is required for the Drivers page itself.
If The Bend is not already open in Supabase, run `supabase/ipswich-confirmed-results-open-the-bend.sql`.
