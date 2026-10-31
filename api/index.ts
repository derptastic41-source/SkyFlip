import type { VercelRequest, VercelResponse } from '@vercel/node';

// Stateless, public-only API. Private account/mod routes must use verified user auth
// and durable storage before being enabled in a multi-user deployment.
const API = 'https://api.hypixel.net/v2/skyblock/auctions';
const blocked = ['/api/mod/', '/api/billing/'];
const emptyScanner = { isScanning: false, lastScanTime: 0, totalAuctionsScanned: 0, totalPagesScanned: 0, totalBinAuctions: 0, activeSnipesCount: 0, scanProgress: 0 };

type Auction = { uuid: string; item_name: string; category?: string; tier?: string; bin: boolean; claimed?: boolean; end: number; start: number; starting_bid: number; auctioneer: string; item_lore?: string; extra?: string };

async function getPublicFlips() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8500);
  try {
    const first = await fetch(`${API}?page=0`, { signal: controller.signal });
    if (!first.ok) throw new Error(`Hypixel returned HTTP ${first.status}`);
    const head = await first.json();
    if (!head.success || !Array.isArray(head.auctions)) throw new Error('Hypixel auction feed unavailable');
    // Bound requests for serverless execution; this is a partial scan, not a full-AH scanner.
    const pages = Math.min(8, Math.max(1, Number(head.totalPages) || 1));
    const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => i + 1).map(async p => {
      const r = await fetch(`${API}?page=${p}`, { signal: controller.signal });
      if (!r.ok) return [] as Auction[];
      const d = await r.json();
      return Array.isArray(d.auctions) ? d.auctions as Auction[] : [];
    }));
    const auctions: Auction[] = [...head.auctions, ...rest.flat()];
    const now = Date.now();
    const bins = auctions.filter(a => a.bin && !a.claimed && a.end > now && a.starting_bid >= 50000);
    const groups = new Map<string, Auction[]>();
    for (const a of bins) {
      const key = [a.item_name.replace(/§[0-9a-fk-or]/gi, '').trim().toLowerCase(), a.tier || '', a.category || ''].join('|');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(a);
    }
    const flips: any[] = [];
    for (const items of groups.values()) {
      if (items.length < 5) continue;
      items.sort((a, b) => a.starting_bid - b.starting_bid);
      const cheapest = items[0];
      const comparisons = items.slice(1, 5).map(a => a.starting_bid);
      const targetPrice = Math.min(...comparisons);
      const buyPrice = cheapest.starting_bid;
      const tax = Math.floor(targetPrice * (targetPrice < 10000000 ? .01 : targetPrice < 100000000 ? .02 : .025));
      const netProfit = targetPrice - buyPrice - tax;
      const margin = netProfit / buyPrice * 100;
      if (netProfit < 250000 || margin < 12 || targetPrice > buyPrice * 3) continue;
      const category = /weapon|sword|bow/i.test(cheapest.category || '') ? 'WEAPONS' : /armor/i.test(cheapest.category || '') ? 'ARMOR' : /accessor|talisman/i.test(cheapest.category || '') ? 'ACCESSORIES' : /pet/i.test(cheapest.category || '') ? 'PETS' : /mining|drill/i.test(cheapest.category || '') ? 'MINING' : 'MISC';
      flips.push({ id: `hypixel_${cheapest.uuid}`, uuid: cheapest.uuid, itemName: cheapest.item_name, category, rarity: cheapest.tier || 'COMMON', isRecombobulated: false, buyPrice, lbin: buyPrice, targetPrice, estimatedValue: targetPrice, taxAmount: tax, netProfit, profitMargin: Math.round(margin * 10) / 10, seller: cheapest.auctioneer, endsAt: cheapest.end, listedAt: cheapest.start, lore: (cheapest.item_lore || '').split('\n').filter(Boolean), demand: items.length >= 10 ? 'HIGH' : 'MEDIUM', auctionType: 'BIN', discoveredAt: now, isSuspectedManipulation: false });
    }
    flips.sort((a, b) => b.netProfit - a.netProfit);
    return { flips: flips.slice(0, 100), count: flips.length, totalScanned: auctions.length, lastUpdated: now, totalPagesScanned: pages, totalBinAuctions: bins.length };
  } finally { clearTimeout(timeout); }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathname = (req.url || '').split('?')[0];
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (blocked.some(prefix => pathname.startsWith(prefix))) {
    return res.status(503).json({ error: 'Account and mod features require per-user authentication and persistent storage; disabled to protect user data.' });
  }
  // User-scoped data uses the caller's Supabase JWT and RLS, never a shared server account.
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const bearer = req.headers.authorization || '';
  const token = bearer.startsWith('Bearer ') ? bearer.slice(7) : '';
  const userPath = pathname.startsWith('/api/player/') || pathname.startsWith('/api/settings/');
  if (userPath) {
    if (!supabaseUrl || !supabaseKey) return res.status(503).json({ error: 'Supabase backend variables are not configured.' });
    if (!token) return res.status(401).json({ error: 'Sign in to use account settings.' });
    const userRes = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, { headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` } });
    if (!userRes.ok) return res.status(401).json({ error: 'Your session has expired. Sign in again.' });
    const user = await userRes.json();
    if (!user?.id) return res.status(401).json({ error: 'Invalid session.' });
    const db = async (table: string, method: string, body?: object) => {
      const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/${table}?user_id=eq.${encodeURIComponent(user.id)}&select=*`, {
        method, headers: { apikey: supabaseKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation,resolution=merge-duplicates' },
        ...(body ? { body: JSON.stringify(body) } : {})
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || `Database error ${response.status}`);
      return data;
    };
    try {
      if (pathname === '/api/player/profile' && req.method === 'GET') {
        const rows = await db('skyflip_players', 'GET');
        const row = rows?.[0];
        return res.status(200).json({ profile: row ? { username: row.username, uuid: row.minecraft_uuid, avatarUrl: `https://mc-heads.net/avatar/${row.minecraft_uuid}/64` } : null });
      }
      if (pathname === '/api/player/connect' && req.method === 'POST') {
        const username = String(req.body?.username || '').trim();
        if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) return res.status(400).json({ error: 'Enter a valid Minecraft username.' });
        const response = await fetch(`https://api.minecraftservices.com/minecraft/profile/lookup/name/${encodeURIComponent(username)}`);
        if (!response.ok) return res.status(404).json({ error: 'Minecraft username not found.' });
        const minecraft = await response.json();
        if (!/^[a-f0-9]{32}$/i.test(minecraft.id || '')) return res.status(502).json({ error: 'Minecraft profile lookup failed.' });
        await db('skyflip_players', 'POST', { user_id: user.id, username: minecraft.name, minecraft_uuid: minecraft.id });
        return res.status(200).json({ success: true, profile: { username: minecraft.name, uuid: minecraft.id, avatarUrl: `https://mc-heads.net/avatar/${minecraft.id}/64` }, notice: 'Username saved. Ownership has not been verified.' });
      }
      if (pathname === '/api/player/disconnect' && req.method === 'POST') { await db('skyflip_players', 'DELETE'); return res.status(200).json({ success: true }); }
      if (pathname === '/api/settings/alerts' && req.method === 'GET') {
        const rows = await db('skyflip_alert_settings', 'GET');
        return res.status(200).json(rows?.[0] ? { scanSeconds: rows[0].scan_seconds, alertSeconds: rows[0].alert_seconds, maxAlerts: rows[0].max_alerts, pageLimit: rows[0].page_limit } : { scanSeconds: 60, alertSeconds: 30, maxAlerts: 1, pageLimit: 20 });
      }
      if (pathname === '/api/settings/alerts' && req.method === 'POST') {
        const int = (v: any, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(Number(v)) ? Math.floor(Number(v)) : min));
        const values = { user_id: user.id, scan_seconds: int(req.body?.scanSeconds, 30, 3600), alert_seconds: int(req.body?.alertSeconds, 10, 3600), max_alerts: int(req.body?.maxAlerts, 1, 100), page_limit: int(req.body?.pageLimit, 1, 100) };
        await db('skyflip_alert_settings', 'POST', values);
        return res.status(200).json({ success: true });
      }
    } catch (error: any) { return res.status(503).json({ error: error?.message || 'Database unavailable. Apply the SQL migration first.' }); }
    return res.status(404).json({ error: 'Unknown account route' });
  }
  if (pathname === '/api/status') return res.status(200).json({ status: 'online', serverTime: Date.now(), scanner: emptyScanner, modConnected: false });
  if (pathname === '/api/hypixel/scanner-status') return res.status(200).json({ ...emptyScanner, mode: 'on-demand', message: 'Public auction scan runs when /api/flips is requested.' });
  if (pathname === '/api/hypixel/scan' && req.method === 'POST') return res.status(202).json({ success: true, message: 'Use GET /api/flips to request an on-demand scan.' });
  if (pathname === '/api/flips' && req.method === 'GET') {
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=30');
    try { return res.status(200).json({ success: true, ...(await getPublicFlips()), scanScope: 'partial', warning: 'Only the first eight Hypixel auction pages are scanned; resale values are estimates.' }); }
    catch (err) { return res.status(502).json({ success: false, error: 'Hypixel feed temporarily unavailable', flips: [], count: 0 }); }
  }
  if (pathname === '/api/hypixel/stats') return res.status(200).json({ ...emptyScanner, activeAuctionsTracked: 0, activeSnipesFound: 0, totalPotentialProfit: 0, highestProfitFlip: null, avgMarginPercent: 0, recentExecutions: [], companionStatus: { connected: false, ign: 'Not Connected', purse: 0, lastSyncTime: 0, membershipTier: 'free' } });
  return res.status(404).json({ error: 'Unknown API route' });
}
