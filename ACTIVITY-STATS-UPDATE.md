# V8 Race Fantasy activity statistics update

Changes:
- Added admin-only last active tracking for every account.
- Added admin-only daily active accounts table.
- Added Online now, Active today and Active last 7 days cards.
- Activity is tracked with a heartbeat while logged-in users are on the site.
- Daily active counts use Brisbane/AEST day boundaries.
- Admin Stats page now loads `profiles.last_seen_at` and `user_activity_days`.

Run this SQL once:
`supabase/activity-stats-upgrade.sql`

Important:
- Historical daily active accounts only start counting after the SQL is run and this website version is deployed.
- Existing `profiles.last_seen_at` values may already show recent activity if the previous heartbeat SQL was run.
- The `user_activity_days` table is admin-readable only, while users can only write/read their own activity rows.
