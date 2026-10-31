import type { VercelRequest, VercelResponse } from '@vercel/node';

// Stateless, public-only API. Private account/mod routes must use verified user auth
// and durable storage before being enabled in a multi-user deployment.
const API = 'https://api.hypixel.net/v2/skyblock/auctions';
const blocked = ['/api/mod/', '/api/player/', '/api/settings/', '/api/billing/'];
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
    const pages = Math.min(4, Math.max(1, Number(head.totalPages) || 1));
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
  if (pathname === '/api/status') return res.status(200).json({ status: 'online', serverTime: Date.now(), scanner: emptyScanner, modConnected: false });
  if (pathname === '/api/hypixel/scanner-status') return res.status(200).json({ ...emptyScanner, mode: 'on-demand', message: 'Public auction scan runs when /api/flips is requested.' });
  if (pathname === '/api/hypixel/scan' && req.method === 'POST') return res.status(202).json({ success: true, message: 'Use GET /api/flips to request an on-demand scan.' });
  if (pathname === '/api/flips' && req.method === 'GET') {
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=30');
    try { return res.status(200).json({ success: true, ...(await getPublicFlips()), scanScope: 'partial', warning: 'Only the first four Hypixel auction pages are scanned; resale values are estimates.' }); }
    catch (err) { return res.status(502).json({ success: false, error: 'Hypixel feed temporarily unavailable', flips: [], count: 0 }); }
  }
  if (pathname === '/api/hypixel/stats') return res.status(200).json({ ...emptyScanner, activeAuctionsTracked: 0, activeSnipesFound: 0, totalPotentialProfit: 0, highestProfitFlip: null, avgMarginPercent: 0, recentExecutions: [], companionStatus: { connected: false, ign: 'Not Connected', purse: 0, lastSyncTime: 0, membershipTier: 'free' } });
  return res.status(404).json({ error: 'Unknown API route' });
}
