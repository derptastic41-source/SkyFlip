# SkyFlip blank-screen fix

Fixed the missing named import for PayPalSandboxButton and the undefined paypalConfig variable.
The frontend now retrieves PayPal Sandbox client ID and plan ID from the existing
`/api/billing/config` backend endpoint; no VITE_ variables are required.

## Windows

Extract this ZIP, open PowerShell in the folder containing package.json, then:

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run dev
```

If `.env` already exists with Sandbox credentials, copy those values into the new `.env`
rather than overwriting them. Open http://localhost:3000.
Without Sandbox credentials, the dashboard still loads but checkout remains disabled.
This is a local Sandbox prototype, not production-ready multiuser billing.
