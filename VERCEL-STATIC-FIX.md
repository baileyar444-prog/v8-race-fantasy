# Vercel static export fix

Use this if the project deploys successfully but the live website shows:

```text
500 Internal Server Error
```

This version turns the app into a static Next.js export so Vercel serves static files instead of running a serverless function for the page.

## What changed

- `next.config.mjs` now includes:
  - `output: "export"`
  - `trailingSlash: true`
  - `images.unoptimized: true`
- Removed `export const dynamic = "force-dynamic"` from `src/app/layout.tsx`
- `vercel.json` now includes:
  - install command: `corepack enable && yarn install --ignore-engines --network-timeout 600000`
  - build command: `yarn build`
  - output directory: leave blank/default in Vercel

## Vercel settings

Use:

```text
Framework Preset: Next.js
Root Directory: blank/default or ./
Node.js Version: 24.x
Install Command: corepack enable && yarn install --ignore-engines --network-timeout 600000
Build Command: yarn build
Output Directory: blank/default
```

Then redeploy with build cache disabled.

## Environment variables

Still keep these in Vercel:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
```
