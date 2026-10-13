# V8 Race Fantasy badge + baseline fix update

Changes:
- Top-right logged-out button now says Log in, not Sign up.
- Log in button opens the login tab directly.
- Reworked the badge component from CSS gradients into proper SVG geometry.
- Badge patterns now scale inside a fixed SVG viewBox, so the pattern stays aligned at every badge size.
- Each badge uses a unique clip path ID, avoiding pattern clipping conflicts when many badges are on one page.
- Added SQL to repair Perth baseline scores.
- Accounts with no Perth team and a 0/null Perth score are corrected to 150.
- Accounts with no score row for locked rounds get a 150 baseline row.
- New signups automatically receive 150 for any already-locked rounds they missed.

Run:
`supabase/badge-baseline-fix-upgrade.sql`

No manual questions needed for the badge patterns; the shield component has been reworked.
