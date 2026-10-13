# Scoring, sortable drivers and compact history update

Changes:
- Race Control now divides driver event fantasy points by the scheduled number of races, not by the number of races currently entered.
  - For a 3-race event: Race 1 contribution = Race 1 points / 3.
  - After Race 2 is published: score = Race 1 / 3 + Race 2 / 3.
  - After Race 3 is published: Race 3 / 3 is added.
  - This stops users losing points when the final race is entered later.
- Points display to one decimal place across the main score areas.
- Drivers page:
  - Added sortable columns for Total FP, Last, Next %, Captain and Vice.
  - Added Chosen %.
  - Event totals are now normalised by scheduled races.
  - Race cells are labelled as raw race points.
- History page:
  - Renamed from My Team to History in navigation/profile links.
  - Rebuilt as a compact table.
  - Click Details on an event to show picks, roles, points and race-by-race driver results.
  - Shows stats such as total, average, scored rounds, C/VC boost and best round.
- No Supabase schema SQL is needed.

Important:
- If Ipswich was already published with the old logic, deploy this update and then republish Ipswich in Race Control.
