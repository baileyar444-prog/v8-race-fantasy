# V8 Race Fantasy team history update

This version adds the proper fantasy-history system.

## Added

- My Team / Team History page
- Event-by-event saved picks
- Captain and vice-captain score snapshots
- Per-driver event points snapshots
- Overall profile stats
- Event-specific leaderboards
- Admin publish/republish flow in Race Control
- No-team events show as 0 points
- Old event teams are view-only once locked/scored

## Required SQL

Run this in Supabase SQL Editor:

```text
supabase/team-history-and-score-snapshots.sql
```

Or run the combined file if you want the latest driver/event update included too:

```text
supabase/combined-feature-and-history-update.sql
```

## Vercel settings stay the same

```text
Framework Preset: Next.js
Node.js Version: 24.x
Install Command: corepack enable && yarn install --ignore-engines --network-timeout 600000
Build Command: yarn build
Output Directory: blank/default
Root Directory: blank/default or ./
```

Do not set Output Directory to `out`.
