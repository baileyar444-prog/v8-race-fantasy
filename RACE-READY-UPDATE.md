# V8 Race Fantasy race-ready update

Changes in this version:

- Perth lockout set to Saturday 01 August 2026, 11:45 AM AEST.
- Ipswich lockout set to Saturday 22 August 2026, 10:05 AM AEST.
- League invite links now remember the league code for logged-out users.
- After a user creates an account or logs in, the app sends them back to the invite and auto-joins the league.
- League owners now see owner tools on their league card.
- League owners can kick/remove members from leagues they created.
- Race Control now has:
  - Saturday readiness checklist
  - Set Perth open button
  - Pre-set Ipswich button
  - clearer explanations for Apply upcoming rounds and Apply latest standings
  - saved teams count
  - published scores count
  - race result completion counts per race
  - warning before publishing if results are incomplete

Run `supabase/race-ready-upgrade.sql` once to update the live DB lockouts and owner-kick RLS policy.
