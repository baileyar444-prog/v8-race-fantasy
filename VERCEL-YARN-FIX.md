# Vercel Yarn deployment fix

This version switches the Vercel install/build process to Yarn classic.

Use this after npm and pnpm both fail during package installation.

## The error this fixes

```text
npm error Exit handler never called!
```

and/or:

```text
pnpm ERR_INVALID_THIS while fetching packages
```

## Changes included

- Removed npm/pnpm lockfiles.
- Removed `pnpm-workspace.yaml`.
- `package.json` now uses:
  - `packageManager: yarn@1.22.22`
  - `engines.node: 24.x`
- Added `.yarnrc`
- Updated `vercel.json`:
  - Install Command: `corepack enable && yarn install --ignore-engines --network-timeout 600000`
  - Build Command: `yarn build`

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
