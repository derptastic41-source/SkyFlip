# SkyFlip scanner / alert controls

Run `npm.cmd install` then `npm.cmd run dev`. Open http://localhost:3000.

On the Flips tab, set scanner interval (60–600 seconds), Minecraft chat alert cooldown (5–600 seconds), and max alerts (1–5). Defaults: 60s, 30s, 1. These settings last until the server restarts.

The scanner now requires at least 5 comparable BIN listings with matched name, rarity, category, star count, basic recomb and pet-level indicators. Estimated profit is **not guaranteed**: Hypixel item NBT, enchantments, attributes, market demand, and actual sale prices still need deeper matching. For safety, the app now excludes sparse markets rather than showing inflated estimates.

The page remains mounted; polling fallback is reduced to 60s. Data updates via SSE still rerender React components normally. If the entire browser reloads, check Vite hot-module reload and file writes.

Security: `/api/settings/alerts` POST is loopback-only and in-memory. Do not expose the local development server to the public Internet as-is. Configure authentication and persistent multi-user settings before deployment.
