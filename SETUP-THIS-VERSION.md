# SkyFlip Beta: functional features and remaining limits

## Deploy

1. Copy the project folders to your GitHub repository (preserve `src/`, `api/`, and `supabase/`).
2. In Supabase Dashboard > SQL Editor, run `supabase/skyflip-user-data.sql` once.
3. In Vercel project settings, add **server-side** `SUPABASE_URL` (the project base URL) and `SUPABASE_ANON_KEY` (public publishable/anon key). Keep the existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the frontend. Redeploy.
4. Test `/api/status`, `/api/flips`, login, Minecraft username lookup, and saved settings.

## What works

- Public Hypixel auctions are fetched on demand (sample of up to 8 pages); estimated BIN comparisons are *not guaranteed profitable* and may compare differently enchanted items.
- Supabase sign-in remains unchanged.
- Per-user Minecraft username lookup and saved alert settings are protected by JWT + Supabase Row Level Security. **Username lookup does not verify Minecraft ownership.**

## What is not complete

- No continuous full-auction scanner or real-time alerts; the UI polls the sample periodically.
- No authenticated Minecraft mod pairing, streaming, or command execution. Existing routes intentionally return 503.
- No PayPal checkout or Premium entitlements. No payments are accepted.
- User-facing alert timing settings are saved but **do not schedule server-side notifications**.

Never add a PayPal client secret or Supabase service-role key to `VITE_` environment variables.
