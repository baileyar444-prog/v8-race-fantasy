# No fastest lap / penalty scoring + Perth Race 23 result update

Changes:
- Fastest lap points no longer count.
- Racing penalty points no longer count.
- Scoring is now qualifying + race finish + classification only.
- Rules page updated.
- Race Control result entry table no longer asks for fastest lap or penalty.
- Race Control has a `Load Race 23 result` button for the latest Perth result.
- Perth Race 23 finish positions are included in `supabase/perth-race23-result-no-fastest-penalty.sql`.

Important:
- This does not remove the database columns. They remain for compatibility.
- Any values in fastest_lap or penalty are ignored by the app from this version onward.
- Run the Race 23 SQL to update the live database immediately.
