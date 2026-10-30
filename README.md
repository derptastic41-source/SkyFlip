# SkyFlip — Vercel Safe Preview

**Deployment state: frontend preview only. Not production-ready.** This version is safe to put in a GitHub repository as long as no secrets or private files are added. PayPal checkout is disabled; Vercel does not run the auction scanner or mod sync service.

## Run locally (Windows)

Open PowerShell in the folder containing `package.json`:

```powershell
npm.cmd install
npm.cmd run dev
```

Then open http://localhost:3000. Local development uses `server.ts` for scanner functionality. **Never expose that local server publicly**: it has a single-account design without sufficient multiuser authentication.

## Deploy the frontend to Vercel

1. Create a **private GitHub repository** and upload the contents of this folder (the folder containing `package.json`). Do not upload `.env`, tokens, credentials or `mod_account.json`.
2. In Vercel, select Add New > Project and import that repository.
3. Framework: **Vite**; Root Directory: repository root; Build Command: `npm run build`; Output Directory: `dist`.
4. Deploy. You will get an HTTPS `*.vercel.app` address with the UI. It will show a prominent **public preview** notice.

**Do not advertise live flips or sell subscriptions from this deployment.** Static Vercel hosting does not run `server.ts`; API-backed features will not work there.

## Production launch blockers

- Real sign-in with secure sessions and per-user authorization for every account/mod endpoint.
- Persistent managed database, user ownership, token hashing and rotation; remove `primaryAccount` and local JSON account persistence.
- Live PayPal verification tied to the authenticated user, webhook signature validation, idempotency, renewals/cancellations, refunds, and reconciliation. No client-only premium unlock.
- Separate hosted auction scanner worker, rate limits, retries, caching and persistent auction results.
- HTTPS API routing, mod compatibility tests, CI build checks, monitoring, legal/privacy disclosures.

## Verification

Run `npm.cmd install`, `npm.cmd run lint`, and `npm.cmd run build` locally before upload. Do not upload `node_modules`.
