# Gold Coast Finals update

This update moves V8 Race Fantasy from Bathurst into the Gold Coast 500 and the start of the Supercars Finals.

## Database / scoring
- Adds the full supplied Bathurst starting grid and race result.
- Bathurst raw driver fantasy points use qualifying + finishing points.
- Bathurst remains a 2x fantasy event multiplier when Race Control publishes the round.
- Maps the Bathurst #15 car result to Craig Lowndes and #34 to James Moffat because they were the selectable fantasy wildcards.
- Loads the supplied post-Bathurst championship standings exactly.
- Closes Bathurst and opens Gold Coast.
- Keeps Gold Coast at 2 races and normal 1x event multiplier.
- Preserves the existing Gold Coast lockout time.
- Gold Coast selection field is the 24 full-time drivers only.
- Categories A-F contain four active drivers each.
- Bathurst co-drivers/wildcards remain in historical data but are inactive for Gold Coast selection.

## Website
- Gold Coast is the current/open fallback event.
- Live ownership, captaincy, vice-captaincy, differentials and saved-team counts now follow Gold Coast automatically.
- Home, dashboard, Pick Team, Drivers, Round Preview and status banner are updated for Gold Coast.
- Adds restrained Finals gold accents while keeping vibrant orange as the main brand.
- Race Control keeps historical Perth/Ipswich/The Bend/Bathurst driver counts correct while using a 24-car active Gold Coast field.
- Sync drivers/categories now uses the post-Bathurst standings.

## Finals gold accents
- Gold: #f6c453
- Soft gold: #ffd76a
- Deep gold: #b7791f

## Run order
1. Deploy the website ZIP.
2. Run `supabase/bathurst-results-open-gold-coast-finals.sql` in Supabase SQL Editor.
3. In Race Control select Bathurst and Publish / Republish scores.
4. Check Gold Coast is open and the Pick Team page shows 24 drivers, four in every category.
