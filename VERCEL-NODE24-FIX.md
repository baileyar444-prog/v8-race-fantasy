# Vercel Node 24 deployment fix

This version updates the project from Node 20 to Node 24.

It fixes Vercel errors like:

```text
Error: Node.js version 20.x is deprecated. Deployments created on or after 2026-10-01 will fail to build. Please set "engines": { "node": "24.x" } in your package.json file to use Node.js 24.
```

## Changes included

- `package.json` now includes:
  - `engines.node = 24.x`
  - `engines.npm = 11.x`
  - `packageManager = npm@11.6.2`
- `.nvmrc` updated to `24`
- `.node-version` updated to `24`
- `vercel.json` install command kept as:
  - `npm install --no-audit --no-fund`

## Vercel setting

In Vercel:

```text
Settings → General or Build and Deployment → Node.js Version → 24.x
```

Then redeploy with build cache disabled.
