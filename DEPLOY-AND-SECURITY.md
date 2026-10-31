# SkyFlip Vercel API repair — limitations

The original `server.ts` is an Express process. Vercel's Vite deployment only built `dist`, so its Express `/api/*` routes did not exist in production. This package adds `api/index.ts` as a Vercel serverless function and routes `/api/*` to it.

## What works in this repair
- Public `GET /api/flips`: fetches up to four pages of current Hypixel auctions, calculates preliminary BIN price comparisons, and returns frontend-compatible fields. This is NOT a full auction-house scan and is NOT guaranteed to find profitable sales.
- `GET /api/status`, `/api/hypixel/scanner-status`, `/api/hypixel/stats`: basic public health and status responses.
- `POST /api/hypixel/scan`: reports that scans are on-demand via `/api/flips`.

## What is intentionally NOT enabled
The original Express backend keeps one shared `primaryAccount`, mod token, membership, alerts, and Minecraft connection in process memory and a local JSON file. Exposing those routes on a public server would risk cross-user account access and data loss. The new serverless API responds with HTTP 503 for `/api/player/*`, `/api/mod/*`, `/api/settings/*`, and `/api/billing/*` until per-user Supabase JWT verification, row-level security, a durable database, and mod token ownership are implemented. This means mod syncing, account linking, alerts, payments, and SSE are not yet functional.

## Deploy
Copy the entire folder structure into the GitHub repository root. Commit and push. Vercel will build Vite and detect the `api/index.ts` function. Keep `VITE_SUPABASE_URL` set to the project base URL (`https://<project>.supabase.co`) and `VITE_SUPABASE_ANON_KEY` set to the public publishable key. Do not upload a secret key.

## Test after deployment
- `/api/status` should return JSON with `status: online`.
- `/api/flips` should return JSON; if Hypixel is unavailable it may return 502, not 404.
- `/api/player/profile` should return 503 intentionally, not 404.

This is a partial, security-conscious backend repair; it does not claim that all SkyFlip features are complete.
