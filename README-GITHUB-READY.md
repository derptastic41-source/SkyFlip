# SkyFlip — GitHub-ready public preview (not payment-ready)

This build improves source safety and is suitable for **reviewing the frontend** on Vercel. It is **not** a production multiuser application. Do not accept real PayPal payments yet.

## Changes
- Fixed missing PayPal component import/config from the prior build.
- Removed Vite native-loader `__dirname` warning.
- Added a read-only public preview mode to the Express backend: mod tokens, pairing, player management, settings, and billing routes are blocked in production or when `SKYFLIP_PUBLIC_PREVIEW=true`.
- Added JSON body limit and basic security headers; no wildcard CORS on private endpoints.
- The public preview cannot inherit a local player's Premium status to bypass free listing delay.
- Added `.gitignore` protection for `.env`, mod_account.json, private keys, dependencies and build artifacts.
- Added Vercel **static frontend** config. **Vercel does not run the long-lived Express scanner from server.ts in this configuration.** Frontend API requests will not work until a separate backend is deployed and connected.

## Local Windows setup
Extract the ZIP, open a terminal in the directory containing package.json, run `npm.cmd install` and `npm.cmd run dev`. No PayPal credentials needed to view dashboard.

## GitHub / Vercel
Push source code only, never `.env` or `mod_account.json`. Import the repository to Vercel (Vite preset, build `npm run build`, output `dist`). Static preview only: API-backed scanner and mod sync need an always-running backend, database and authentication.

## Critical blockers before real payments
1. Multiuser sign-in and server-side sessions.
2. Persistent database with separate accounts and hashed mod tokens; remove shared `primaryAccount`.
3. PayPal Live subscription ownership binding, webhook signature verification, idempotency, cancellation and failed-payment handling.
4. Auth/authorization for every user-specific endpoint, SSE, settings and commands.
5. Hosted worker for Hypixel scanning, rate limiting, retries and persistent auction data.
6. End-to-end tests, billing sandbox QA, privacy policy and deployment monitoring.

Never use the local Sandbox test payment implementation to accept real money.
