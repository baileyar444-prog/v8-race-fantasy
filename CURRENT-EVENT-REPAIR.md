# Current event selection repair

This patch fixes stale current-round labels such as The Bend appearing as next while Gold Coast is current.

The public app now selects the nearest valid unlocked current event rather than blindly taking the first `is_open_event=true` row. This protects the UI when an old event remains incorrectly flagged open.

For the database, run `gold-coast-only-open-event.sql` once to make Gold Coast the only open event.
