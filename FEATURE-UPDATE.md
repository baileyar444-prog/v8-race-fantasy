# V8 Race Fantasy feature update

This version adds:

- Captain and vice-captain cannot be the same driver.
- Latest 2026 driver standings and A-F categories for the active 24-car field.
- Race Control quick setup buttons.
- Round lockout countdowns.
- A proper landing page.
- Remaining rounds use clean location names only.

## After deploying

Run this in Supabase SQL Editor:

```text
supabase/latest-2026-standings-and-events.sql
```

Or open Race Control and click:

```text
Apply upcoming rounds
Apply latest standings
```

## Keep Vercel settings

```text
Framework Preset: Next.js
Node.js Version: 24.x
Install Command: corepack enable && yarn install --ignore-engines --network-timeout 600000
Build Command: yarn build
Output Directory: blank/default
Root Directory: blank/default or ./
```
