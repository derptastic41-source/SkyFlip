# SkyFlip — Supabase email/password accounts

## Included
- Registration, login, confirmation-email messaging, forgot-password email, password recovery, logout
- Protected SkyFlip dashboard and account settings with password update
- Supabase Auth session persistence via `@supabase/supabase-js`
- No private credentials embedded in the ZIP

## Configure
1. In Supabase > Authentication > Providers > Email, enable Email and **Confirm email**.
2. In Supabase > Authentication > URL Configuration, set Site URL to `https://sky-flip-ah.vercel.app` and add `https://sky-flip-ah.vercel.app/**` to redirect URLs. Add Preview URLs only if needed and trusted.
3. In Vercel > sky-flip-ah > Settings > Environment Variables, set `VITE_SUPABASE_URL` to the Supabase Project URL and `VITE_SUPABASE_ANON_KEY` to the **publishable** or legacy anon key (never service_role/secret key). Set for Production and optionally Preview/Development.
4. Replace your GitHub repository files with the contents of this project folder and commit. Vercel's Git integration builds and deploys it automatically. **Simply redeploying the old commit will not add the login UI.**
5. Test signup with a fresh email, verify it, log in, reset password, and log out.

## Security and limitations
Supabase handles authentication and session tokens. The browser UI is gated, but **the old Express API in `server.ts` is not deployed by this Vercel static-site configuration and is NOT protected by these login screens**. No user-specific auction data, Minecraft token, or payment entitlement has been migrated to Supabase. Do not expose or deploy the old shared API as a public multiuser backend until every sensitive endpoint validates Supabase JWTs and enforces per-user ownership. The existing scanner, Minecraft pairing, and PayPal checkout are not made functional by this release.

Account settings currently support changing password, viewing email/verification, and signing out. Email address changes, per-user filters and Minecraft pairing need separate secure backend work.
