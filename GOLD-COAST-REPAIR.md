# Gold Coast transition repair

- Removes the hard-coded “Pick The Bend” home action.
- Uses the live/open event for quick actions.
- Sets fallback Gold Coast lockout to 24 October 2026 at 11:30 AEST.
- Makes Home, Dashboard, Drivers, Launch Mode and Round Preview prefer Gold Coast during the post-Bathurst transition.
- Pick Team only saves when a real live event and real active driver roster have loaded from Supabase.
- If the live event or roster is incomplete, users now see a clear database-state message instead of a broken/partial picker.
