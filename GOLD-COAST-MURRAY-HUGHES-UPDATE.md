# Gold Coast Murray / Hughes roster update

Updated for the Gold Coast 500 field change:

- Cooper Murray remains Category E and keeps P18 / 972 championship points, but now drives #777 for PremiAir Racing.
- Declan Fraser is inactive and no longer selectable for Gold Coast. His historical results/standings are retained.
- Jarrod Hughes is active in Category F in the #99 Erebus Motorsport car.
- Jarrod is displayed as Position N/A / Season points N/A. Internally, `points_position=999` and `championship_points=0` are used for compatibility with the current numeric database schema.
- Existing Gold Coast picks of Cooper Murray remain valid because his driver ID does not change.
- Existing Gold Coast picks of Declan Fraser are removed and captain/vice selections are cleared if necessary; affected users must select a replacement Category F driver.

Run `supabase/gold-coast-murray-hughes-update.sql`, then deploy this website version.
