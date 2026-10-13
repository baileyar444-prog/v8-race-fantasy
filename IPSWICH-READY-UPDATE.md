# V8 Race Fantasy Ipswich ready update

This version moves the app on from Perth to Ipswich.

Changes:
- Perth is closed as the open round.
- Ipswich is now the open round.
- Ipswich lockout remains Sat 22 Aug 2026 at 10:05 AM AEST.
- Driver standings updated from the supplied post-Perth standings.
- Driver classes updated for Ipswich:
  - A: Payne, Feeney, Waters, Kostecki
  - B: Allen, De Pasquale, Brown, Mostert
  - C: Wood, Le Brocq, Golding, Randle
  - D: Heimgartner, Ojeda, Reynolds, Hill
  - E: Bates, Fraser, Aaron Cameron, Rylan Gray, Cooper Murray
  - F: Macauley Jones, Jackson Walls, Jobe Stewart, Bayley Hall, Ben Gomersall
- Added Bayley Hall and Ben Gomersall as Ipswich wildcards.
- Kept wildcard championship position as display N/A on the pick-team page.
- Added P25/P26 race finish points for expanded grids.
- Race Control now expects 24 cars for Perth and 26 cars for Ipswich.
- Race Control quick setup is now focused on Ipswich.
- Added a Forgot password button on the login page.
- Added `/reset-password` page for users to set a new password after opening the Supabase reset email.

Run this SQL once:
`supabase/ipswich-ready-upgrade.sql`

If password reset emails do not redirect correctly, add this redirect URL in Supabase Auth URL Configuration:
`https://v8racefantasy.com/reset-password`

The broader wildcard redirect `https://v8racefantasy.com/**` should already cover it if that is still saved in Supabase.
