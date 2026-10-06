# Orange + connection messages update

- Keeps the corrected Bathurst build fix.
- Replaces red/orange branding gradients with vibrant orange shades (#ff7a00, #ff9f1c, #ffb347).
- Updates new/default profile and shield colours to orange.
- Adds a shared friendly message when the live Supabase data service cannot be reached.
- Adds an app-wide retry warning through the round status banner.
- Login, leaderboard, drivers, history, leagues, onboarding and other public flows now use clearer connection messages instead of raw network errors.
- Leaderboard no longer says "No users found" when its database request actually failed.
- No Supabase SQL changes are required.
