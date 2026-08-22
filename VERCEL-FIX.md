# Vercel fixed deployment version

This version fixes the Vercel deployment issue where Vercel failed at:

```text
Command "npm install" exited with 1
npm error Exit handler never called!
```

## What changed

- Added `vercel.json`
- Forces Vercel to use:

```bash
npm ci --no-audit --no-fund
```

instead of default `npm install`.

- Updated `next.config.mjs` so the production build completes cleanly on Vercel.
- Added a safer Supabase browser client for build-time rendering.
- Wrapped the leaderboard search params page in Suspense.

## What to do

Push this version to GitHub, then redeploy in Vercel.

```bash
git add .
git commit -m "Fix Vercel deployment"
git push
```

Then in Vercel, redeploy the latest commit.
