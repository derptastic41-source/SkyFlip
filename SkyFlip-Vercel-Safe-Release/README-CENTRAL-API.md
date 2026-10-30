# SkyFlip — centralized Hypixel auction scanner

This version removes the user-facing Hypixel developer API key input. The existing backend already fetches the public Hypixel auction endpoint (`/v2/skyblock/auctions`) without a key, scans centrally, and serves results to all connected clients. **No developer key is needed for public auctions.**

## Start on Windows
From this folder run `npm.cmd install` then `npm.cmd run dev` and open http://localhost:3000.

## Important
- The Minecraft **mod connection token** is separate from a Hypixel developer API key; keep using the mod token to authenticate sync requests.
- Private or key-restricted Hypixel API endpoints are NOT automatically enabled by this change. If added later, configure a server-side secret only, respect Hypixel usage policies and rate limits, and never expose it to browser or mod clients.
- The server currently uses a single `connectedPlayer` / primary account state; production multi-user hosting requires separate per-user accounts and tokens, a database, and authentication before deployment.
- A Minecraft username lookup alone is not proof that the person owns that account; add account ownership verification before granting account-specific access.
- This project has not been compile-tested in this environment.
