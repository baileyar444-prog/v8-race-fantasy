# V8 Race Fantasy league sharing and presence update

This version adds:

- League share button using the phone/native share sheet where available.
- Fallback share copy for desktop browsers.
- Shared league links using `/leagues?join=CODE` so logged-in users can auto-join from the link.
- Leaderboard removes the Manager column and only shows garage names.
- Leaderboard online indicator using a green dot when a profile heartbeat was seen recently.
- App-wide activity heartbeat component.
- Website logo used as favicon, apple touch icon and app icon.
- Member Emails page now displays the exact signup timestamp with date, time, seconds and time zone.

Required SQL:

Run `supabase/activity-presence-upgrade.sql` once in Supabase SQL Editor so `last_seen_at` exists.
