# Perth qualifying grid update

This version adds the current Perth starting grids supplied for Saturday 01 August 2026.

Mapped in the app as:
- Race 23 = Perth Race 1
- Race 24 = Perth Race 2
- Race 25 = Perth Race 3, left blank for now

Race Control updates:
- Added a `Load Perth Race 23/24 grids` button.
- The button preloads qualifying/grid positions for Race 23 and Race 24.
- It preserves existing finish positions and classification if they have already been entered. Fastest lap and penalty fields no longer affect scoring.
- Publishing now checks finish completion, not just qualifying rows, so preloaded grids will not accidentally make the event look fully finished.
- Race tabs/status now show Race 23, Race 24 and Race 25 for Perth.
- Status cards show grid rows and finish rows separately.

Important:
The supplied Race 23 grid penalties are reflected in the starting positions. No extra V8 Race Fantasy race penalty is applied automatically.

Optional SQL:
Run `supabase/perth-qualifying-grids.sql` if you want to preload the live Supabase database directly instead of using the Race Control button.
