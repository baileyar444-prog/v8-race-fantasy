# Vercel pnpm deployment fix

This version switches Vercel away from npm because Vercel kept failing before build with:

```text
npm error Exit handler never called!
Error: Command "npm install --no-audit --no-fund" exited with 1
```

## What changed

- Removed `package-lock.json`
- `package.json` now uses:
  - `packageManager: pnpm@10.22.0`
  - `engines.node: 24.x`
- Added `pnpm-workspace.yaml`
- Updated `vercel.json`:
  - install command: `corepack enable && pnpm install --no-frozen-lockfile`
  - build command: `pnpm run build`

## Vercel settings

Use:

```text
Framework Preset: Next.js
Install Command: corepack enable && pnpm install --no-frozen-lockfile
Build Command: pnpm run build
Output Directory: Next.js default
Node.js Version: 24.x
Root Directory: blank/default or ./
```

Then redeploy with build cache disabled.
