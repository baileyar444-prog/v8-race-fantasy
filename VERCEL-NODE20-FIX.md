# Vercel Node 20 / npm 10 deployment fix

This version pins the Vercel build environment to Node 20 / npm 10.

It fixes repeated Vercel install failures like:

```text
npm error Exit handler never called!
Command "npm ci --no-audit --no-fund" exited with 1
```

## Changes included

- `package.json` now includes:
  - `engines.node = 20.x`
  - `engines.npm = 10.x`
  - `packageManager = npm@10.9.2`
- Added `.nvmrc`
- Added `.node-version`
- Added `.npmrc`
- Updated `vercel.json` to use:
  - `npm install --no-audit --no-fund`

## Also do this in Vercel

In Vercel project settings:

```text
Settings → General → Node.js Version → 20.x
```

Then redeploy.
