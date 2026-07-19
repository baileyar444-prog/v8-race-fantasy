# V8 Race Fantasy Race Control scoring version

This is the latest/best version.

## What changed

- Race Control remains admin-only.
- Race Control now edits event settings.
- Race Control now edits driver names, teams, car numbers, categories and website stats.
- Race Control now enters results race-by-race for each round.
- Race Control calculates race fantasy points.
- Race Control publishes event fantasy scores to the leaderboard.
- Multi-race rounds are normalised by averaging driver race scores.
- Event multipliers still apply after normalisation.
- Badge/team number input is capped at 3 characters.
- Garage/banner colour now has 10 preset colours.

## Important SQL step

Before testing this version, run this in Supabase SQL Editor:

```text
supabase/race-control-scoring-upgrade.sql
```

This adds:

```text
profiles.banner_colour
```

and keeps Race Control database permissions admin-only.

Then make yourself admin if needed:

```sql
update public.profiles
set role = 'admin'
where email = 'bailey.a.r444@gmail.com';
```

## Setup

This configured zip includes `.env.local`.

Run:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Testing checklist

1. Log in as admin.
2. Go to Race Control.
3. Select the current event.
4. Confirm number of races is correct.
5. Enter Race 1 results and save.
6. Enter Race 2/Race 3 if needed and save each race.
7. Click Publish event scores to leaderboard.
8. Open Leaderboard and confirm points update.

## Current scoring rules

Qualifying:
- P1 20
- P2 17
- P3 15
- P4 13
- P5 11
- P6–P10: 10 down to 6
- P11–P15: 5 down to 1
- P16+ 0

Race finish:
- P1 60
- P2 54
- P3 49
- P4 45
- P5 41
- P6 38
- P7 35
- P8 32
- P9 29
- P10 26
- P11 24
- P12 22
- P13 20
- P14 18
- P15 16
- P16 14
- P17 12
- P18 10
- P19 8
- P20 6
- P21 5
- P22 4
- P23 3
- P24 2

Bonuses/penalties:
- Fastest lap +5
- Minor penalty -5
- Major penalty -10
- DNF -10
- DNS -15
- DSQ -25


## Vercel npm crash fix

This version pins deployment to Node 20 / npm 10.

Read:

```text
VERCEL-NODE20-FIX.md
```


## Vercel Node 24 fix

This version updates deployment to Node 24 / npm 11.

Read:

```text
VERCEL-NODE24-FIX.md
```


## Vercel pnpm fix

This version switches the Vercel install/build process from npm to pnpm.

Read:

```text
VERCEL-PNPM-FIX.md
```


## Vercel Yarn fix

This version switches deployment from npm/pnpm to Yarn classic.

Read:

```text
VERCEL-YARN-FIX.md
```


## Vercel static 500 fix

This version uses Next.js static export to avoid Vercel runtime/serverless 500 errors.

Read:

```text
VERCEL-STATIC-FIX.md
```

## Latest feature update

This build adds captain/vice-captain validation, refreshed 2026 driver categories, easier Race Control, round lockout countdowns, a new landing page, and remaining-round location names.

After deployment, run this SQL file in Supabase:

```text
supabase/latest-2026-standings-and-events.sql
```

Keep Vercel Output Directory blank/default.


## Team history update

This version adds My Team history, saved pick/points snapshots, event-by-event leaderboards and Race Control republishing.

Run this SQL after deploying:

```text
supabase/team-history-and-score-snapshots.sql
```

Read:

```text
TEAM-HISTORY-UPDATE.md
```
