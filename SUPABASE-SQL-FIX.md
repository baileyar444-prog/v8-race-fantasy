# Supabase SQL UUID fix

The previous SQL failed because it inserted text slugs such as `perth` into UUID `id` columns.

This version fixes it by:
- not inserting into `events.id`
- not inserting into `drivers.id`
- using `slug` for `perth`, `ipswich`, driver slugs, etc.
- letting Supabase generate UUID ids automatically

Run:

```text
supabase/latest-2026-standings-and-events.sql
```

in Supabase SQL Editor.
