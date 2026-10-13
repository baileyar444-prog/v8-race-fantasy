# Gold Coast name bug fix

The old `applyRaceReadyPreset()` function only had explicit branches for Perth and Ipswich. Every other slug used The Bend as the fallback preset. Therefore calling the Gold Coast quick action could write `name = The Bend`, `full_name = The Bend`, The Bend lockout and sort order into the `gold-coast` row.

This update gives each remaining round its own explicit preset and also uses the resilient current-event selector added in this repair.
