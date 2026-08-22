# V8 Race Fantasy admin stats update

This update includes:

- A more compact logged-in homepage dashboard.
- The homepage action buttons now stack vertically.
- The saved team header uses a smaller button to reduce wasted height.
- Pick Team / onboarding now starts with Step 1: Save your team.
- Garage / Team Name and badge are now Step 2.
- Team saving can happen before finishing the garage badge details.
- Added admin-only Website Statistics page at `/admin-stats`.
- Added admin navigation links for Website Stats.
- Added Supabase SQL permissions for admin stats.

Run this SQL in Supabase:

```text
supabase/admin-stats-upgrade.sql
```
