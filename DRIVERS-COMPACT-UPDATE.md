# Drivers compact update

Changes:
- Drivers page is now a compact table instead of long driver cards.
- Each row shows key summary stats:
  - Driver
  - Category
  - Championship position/points
  - Total fantasy points
  - Last round fantasy points
  - Open-round picked %
  - Captaincy %
  - Vice-captaincy %
  - Status
- Clicking a driver name expands detailed stats on screen.
- Expanded details show:
  - Event-by-event category
  - Picked %
  - Captain %
  - Vice %
  - Race 1/2/3 qualifying points
  - Race 1/2/3 race points
  - Race 1/2/3 total fantasy points
  - Event total fantasy points
- Drivers shown are only those involved from Perth onwards:
  - active current drivers
  - drivers with race results
  - drivers picked in teams
  - drivers used as captain or vice-captain
- This removes old bulky driver cards and makes the page much easier to scan.

No Supabase SQL needed.
