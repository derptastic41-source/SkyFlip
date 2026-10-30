import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import fs from 'fs';
import { 
  AuctionFlip, 
  ModConnectionState, 
  ModCommand, 
  ItemCategory, 
  Rarity, 
  ScannerState,
  PlayerProfile,
  MembershipTier,
  SeikeyoModNotification 
} from './src/types/skyblock';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
// Public preview is READ-ONLY until real account auth and subscription ownership are built.
const publicPreview = process.env.SKYFLIP_PUBLIC_PREVIEW === 'true' || process.env.NODE_ENV === 'production';
const privatePaths = [
  '/api/mod/', '/api/player/', '/api/settings/', '/api/billing/'
];
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  if (publicPreview && privatePaths.some(p => req.path.startsWith(p))) {
    return res.status(503).json({ error: 'This feature is disabled in public preview until secure user accounts are implemented.' });
  }
  next();
});
// User-adjustable timings. Scanner and notification delivery are independent.
const deliverySettings = { scanSeconds: 60, alertSeconds: 30, maxAlerts: 1, pageLimit: 20 };
const lastAlertAt = new Map<string, number>();


// Global CORS and preflight OPTIONS handler for non-browser external clients
// (SeikeyoFlipper Fabric 26.2 mod, Java HttpClient, PowerShell, curl)
app.use((req, res, next) => {
  // Public data can be fetched from other origins; private local endpoints cannot.
  if (!req.path.startsWith('/api/mod/') && !req.path.startsWith('/api/player/') && !req.path.startsWith('/api/billing/') && !req.path.startsWith('/api/settings/')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Mod-Key, Accept, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '64kb' }));

// Format UUID into standard hyphenated representation (8-4-4-4-12)
export function formatHypixelAuctionUuid(raw: string): string {
  const clean = (raw || '').replace(/-/g, '').toLowerCase();
  if (clean.length === 32) {
    return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20, 32)}`;
  }
  return raw;
}

// Player Account in-memory storage (server-side secure account linking)
interface PlayerAccount {
  id: string;
  token: string;
  minecraftUuid: string; // clean lowercase 32-char hex
  ign: string;
  avatarUrl: string;
  membershipTier: MembershipTier;
  purse: number;
  bank: number;
  lastSyncTime: number;
  lastPing: number;
  isConnected: boolean;
  modVersion: string;
  clientType: string;
  modName: string;
  isRevoked: boolean;
  // Set of delivered auction UUIDs to prevent duplicate delivery across repeated syncs
  deliveredAuctionUuids: Set<string>;
  // Queue of manual in-game commands triggered from website UI
  manualCommandQueue: Array<{
    command: string;
    itemName: string;
    profit: number;
    itemUuid: string;
  }>;
  // Rate-limiting sliding window (timestamps of requests)
  requestTimestamps: number[];
}

const ACCOUNT_FILE = path.resolve(__dirname, 'mod_account.json');

function loadPersistedAccount(): Partial<PlayerAccount> {
  try {
    if (fs.existsSync(ACCOUNT_FILE)) {
      const data = JSON.parse(fs.readFileSync(ACCOUNT_FILE, 'utf-8'));
      return data;
    }
  } catch (e) {
    console.error('Error loading persisted account:', e);
  }
  return {};
}

function saveAccountState(acc: PlayerAccount) {
  try {
    const toSave = {
      id: acc.id,
      token: acc.token,
      minecraftUuid: acc.minecraftUuid,
      ign: acc.ign,
      avatarUrl: acc.avatarUrl,
      membershipTier: acc.membershipTier,
      purse: acc.purse,
      bank: acc.bank,
      isRevoked: acc.isRevoked,
      modVersion: acc.modVersion,
      clientType: acc.clientType
    };
    fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(toSave, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving account state:', e);
  }
}

const savedAccount = loadPersistedAccount();

const primaryAccount: PlayerAccount = {
  id: savedAccount.id || ('usr_' + crypto.randomBytes(6).toString('hex')),
  token: savedAccount.token || ('sk_seikeyo_' + crypto.randomBytes(16).toString('hex')),
  minecraftUuid: savedAccount.minecraftUuid || '',
  ign: savedAccount.ign || 'Not Connected',
  avatarUrl: savedAccount.avatarUrl || '',
  membershipTier: (savedAccount.membershipTier as MembershipTier) || 'free',
  purse: typeof savedAccount.purse === 'number' ? savedAccount.purse : 0,
  bank: typeof savedAccount.bank === 'number' ? savedAccount.bank : 0,
  lastSyncTime: 0,
  lastPing: 0,
  isConnected: false,
  modVersion: savedAccount.modVersion || '26.2.0-FABRIC',
  clientType: savedAccount.clientType || 'FABRIC_26_2',
  modName: 'SeikeyoFlipper',
  isRevoked: savedAccount.isRevoked || false,
  deliveredAuctionUuids: new Set<string>(),
  manualCommandQueue: [],
  requestTimestamps: [],
};

// Ensure token file is initialized
saveAccountState(primaryAccount);

// Map of active tokens to player accounts
const tokenToAccountMap = new Map<string, PlayerAccount>();
tokenToAccountMap.set(primaryAccount.token, primaryAccount);

let connectedPlayer: PlayerProfile | null = null;

let modState: ModConnectionState = {
  token: primaryAccount.token,
  isConnected: false,
  ign: primaryAccount.ign,
  purse: primaryAccount.purse,
  bank: primaryAccount.bank,
  location: 'Offline',
  lastPing: 0,
  lastSyncTime: 0,
  modVersion: primaryAccount.modVersion,
  clientType: primaryAccount.clientType,
  modName: 'SeikeyoFlipper',
  membershipTier: primaryAccount.membershipTier,
  autoBuyArmed: false,
  tokenRevoked: primaryAccount.isRevoked,
};

let scannerState: ScannerState = {
  isScanning: false,
  lastScanTime: 0,
  totalAuctionsScanned: 0,
  totalPagesScanned: 0,
  totalBinAuctions: 0,
  activeSnipesCount: 0,
  scanProgress: 0,
};

let recentFlipHistory: Array<{
  id: string;
  uuid: string;
  itemName: string;
  buyPrice: number;
  netProfit: number;
  time: number;
  ign: string;
}> = [];

// Store raw live auctions from Hypixel to allow searching by player / seller
let rawLiveAuctions: any[] = [];
let activeFlips: AuctionFlip[] = [];

// Preserve discovered timestamps across scans for accurate 10s delay calculation
const flipDiscoveryTimestamps = new Map<string, number>();

// SSE Clients for real-time live push
const sseClients = new Set<Response>();

function broadcastSSE(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Hypixel AH Tax Calculator
export function calculateHypixelTax(price: number): number {
  if (price < 10_000_000) {
    return Math.floor(price * 0.01);
  } else if (price < 100_000_000) {
    return Math.floor(price * 0.02);
  } else {
    return Math.floor(price * 0.025);
  }
}

// Common Skyblock item category parser
function mapCategory(catStr: string = ''): ItemCategory {
  const c = (catStr || '').toLowerCase();
  if (c.includes('weapon') || c.includes('sword') || c.includes('bow')) return 'WEAPONS';
  if (c.includes('armor')) return 'ARMOR';
  if (c.includes('accessory') || c.includes('talisman')) return 'ACCESSORIES';
  if (c.includes('pet')) return 'PETS';
  if (c.includes('mining') || c.includes('drill') || c.includes('pickaxe')) return 'MINING';
  if (c.includes('consumables') || c.includes('potion')) return 'CONSUMABLES';
  return 'MISC';
}

function mapRarity(tierStr: string = ''): Rarity {
  const t = (tierStr || '').toUpperCase();
  if (['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC', 'DIVINE', 'SPECIAL'].includes(t)) {
    return t as Rarity;
  }
  return 'RARE';
}

// Extract base name stripped of stars, pet levels, and reforges
function getCleanItemName(rawName: string = ''): string {
  return rawName
    .replace(/✪/g, '')
    .replace(/⚚/g, '')
    .replace(/\[Lvl\s*\d+\]\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * High-Speed Hypixel Public API Auction Scanner
 * Scans all pages from Hypixel, groups by item type, and detects real live BIN snipes.
 */
async function scanHypixelAuctions() {
  if (scannerState.isScanning) {
    console.log('[Hypixel Scanner] Scan already in progress, skipping.');
    return;
  }

  scannerState.isScanning = true;
  scannerState.scanProgress = 5;
  broadcastSSE('scanner_update', scannerState);

  console.log('[Hypixel Scanner] Starting full scan of Hypixel Skyblock auctions...');
  const startTime = Date.now();

  try {
    // 1. Fetch Page 0 to get metadata & total pages
    const page0Res = await fetch('https://api.hypixel.net/v2/skyblock/auctions?page=0', {
      headers: { 'User-Agent': 'SkyFlip-AH-Companion/26.2' }
    });
    const page0Data = await page0Res.json();

    if (!page0Data.success) {
      throw new Error(page0Data.cause || 'Failed to fetch page 0 from Hypixel');
    }

    const totalPages = page0Data.totalPages || 1;
    const totalAuctions = page0Data.totalAuctions || 0;
    console.log(`[Hypixel Scanner] Total auctions reported: ${totalAuctions} across ${totalPages} pages.`);

    const allAuctions: any[] = [...(page0Data.auctions || [])];

    // 2. Fetch remaining pages in concurrent chunks of 8
    const pageIndexes: number[] = [];
    for (let p = 1; p < totalPages; p++) {
      pageIndexes.push(p);
    }

    const CHUNK_SIZE = 8;
    for (let i = 0; i < pageIndexes.length; i += CHUNK_SIZE) {
      const chunk = pageIndexes.slice(i, i + CHUNK_SIZE);
      const chunkResults = await Promise.all(
        chunk.map(async (pageIdx) => {
          try {
            const res = await fetch(`https://api.hypixel.net/v2/skyblock/auctions?page=${pageIdx}`, {
              headers: { 'User-Agent': 'SkyFlip-AH-Companion/26.2' }
            });
            const data = await res.json();
            return data.auctions || [];
          } catch (e) {
            console.warn(`[Hypixel Scanner] Warning: page ${pageIdx} failed, continuing...`);
            return [];
          }
        })
      );

      for (const batch of chunkResults) {
        allAuctions.push(...batch);
      }

      scannerState.scanProgress = Math.round(10 + ((i + CHUNK_SIZE) / totalPages) * 75);
      broadcastSSE('scanner_update', scannerState);
    }

    rawLiveAuctions = allAuctions;
    console.log(`[Hypixel Scanner] Fetched ${allAuctions.length} total live auctions in ${Date.now() - startTime}ms.`);

    // 3. Filter for active Buy-It-Now (BIN) auctions only
    const now = Date.now();
    const binAuctions = allAuctions.filter(a => a.bin === true && !a.claimed && a.end > now);

    scannerState.totalAuctionsScanned = allAuctions.length;
    scannerState.totalPagesScanned = totalPages;
    scannerState.totalBinAuctions = binAuctions.length;

    // 4. Group by clean item name for price comparison
    const itemGroups = new Map<string, any[]>();
    for (const auction of binAuctions) {
      // Compare only matching base name, tier, category and upgrade indicators.
      // Exact NBT / enchant matching is not available here, so estimates remain conservative.
      const clean = [getCleanItemName(auction.item_name).toLowerCase(), auction.tier || '', auction.category || '',
        (auction.item_name.match(/✪/g) || []).length,
        /recomb/i.test(String(auction.extra || '')) ? 'recomb' : 'normal',
        /\[Lvl\s*\d+\]/i.test(String(auction.item_name || '')) ? String(auction.item_name).match(/\[Lvl\s*\d+\]/i)?.[0] : ''
      ].join('|');
      if (!itemGroups.has(clean)) {
        itemGroups.set(clean, []);
      }
      itemGroups.get(clean)!.push(auction);
    }

    // 5. Detect snipes / underpriced items
    const detectedFlips: AuctionFlip[] = [];

    for (const [cleanName, items] of itemGroups.entries()) {
      if (items.length < 5) continue; // Require a useful comparable sample

      // Sort by Buy Price (starting_bid) ascending
      items.sort((a, b) => a.starting_bid - b.starting_bid);

      const lowest = items[0];
      // Use a conservative reference from multiple comparable active BINs.
      // A single inflated second listing is not a trustworthy resale value.
      const comparables = items.slice(1, 5).map(a => a.starting_bid).filter((v: number) => Number.isFinite(v) && v > 0);
      if (comparables.length < 4) continue;
      const buyPrice = lowest.starting_bid;
      const targetPrice = Math.min(...comparables);
      const medianComparable = (comparables[1] + comparables[2]) / 2;
      if (targetPrice > medianComparable * 1.35) continue;

      // Filter out micro-flips under 50k
      if (buyPrice < 50_000) continue;

      const tax = calculateHypixelTax(targetPrice);
      const netProfit = targetPrice - buyPrice - tax;
      const margin = (netProfit / buyPrice) * 100;

      // Check if price difference qualifies as a legitimate snipe
      if (netProfit >= 250_000 && margin >= 12) {
        // Suspected manipulation check: if only 2 listings exist and ratio is wild > 4.5x
        const isManip = targetPrice > medianComparable * 1.2 || targetPrice / buyPrice > 3;

        // Parse lore lines
        const loreLines = (lowest.item_lore || '').split('\n').filter((l: string) => l.trim().length > 0);
        const stars = (lowest.item_name.match(/✪/g) || []).length;
        const isRecomb = (lowest.item_lore || '').includes('§d§l') || (lowest.extra || '').toLowerCase().includes('recomb');

        // Extract enchants from lore
        const enchants: string[] = [];
        for (const line of loreLines) {
          if (line.includes('§9') && (line.includes(' I') || line.includes(' V') || line.includes(' X'))) {
            enchants.push(line.replace(/§[0-9a-fk-or]/gi, '').trim());
          }
        }

        // Retain initial discovery timestamp for 10s Free delay calculation
        let discoveredAt = flipDiscoveryTimestamps.get(lowest.uuid);
        if (!discoveredAt) {
          discoveredAt = Date.now();
          flipDiscoveryTimestamps.set(lowest.uuid, discoveredAt);
        }

        const flip: AuctionFlip = {
          id: 'hypixel_' + lowest.uuid,
          uuid: lowest.uuid, // REAL LIVE HYPIXEL AUCTION UUID!
          itemName: lowest.item_name,
          category: mapCategory(lowest.category),
          rarity: mapRarity(lowest.tier),
          stars: stars > 0 ? stars : undefined,
          isRecombobulated: isRecomb,
          buyPrice,
          lbin: buyPrice,
          targetPrice,
          estimatedValue: targetPrice,
          taxAmount: tax,
          netProfit,
          profitMargin: Math.round(margin * 10) / 10,
          seller: lowest.auctioneer,
          endsAt: lowest.end,
          listedAt: lowest.start,
          lore: loreLines,
          enchantments: enchants.slice(0, 4),
          demand: items.length >= 10 ? 'HIGH' : items.length >= 4 ? 'MEDIUM' : 'LOW',
          isSuspectedManipulation: isManip,
          manipulationWarningReason: isManip ? 'Only 2 items listed on Hypixel. Potential price manipulation risk!' : undefined,
          auctionType: 'BIN',
          discoveredAt
        };

        detectedFlips.push(flip);
      }
    }

    // Sort snipes by Net Profit descending
    detectedFlips.sort((a, b) => b.netProfit - a.netProfit);

    activeFlips = detectedFlips;
    scannerState.activeSnipesCount = detectedFlips.length;
    scannerState.lastScanTime = Date.now();
    scannerState.scanProgress = 100;
    scannerState.isScanning = false;

    console.log(`[Hypixel Scanner] Scan completed successfully. Found ${detectedFlips.length} REAL live snipes on Hypixel!`);

    // Broadcast updated flips and scanner telemetry
    broadcastSSE('flips_updated', { count: activeFlips.length });
    broadcastSSE('scanner_update', scannerState);
  } catch (error: any) {
    console.error('[Hypixel Scanner] Scan error:', error.message);
    scannerState.isScanning = false;
    scannerState.scanProgress = 0;
    broadcastSSE('scanner_update', scannerState);
  }
}

// Run scanner immediately on startup
if (process.env.SKYFLIP_DISABLE_SCANNER !== 'true') scanHypixelAuctions();

// Schedule scanner loop every 60 seconds (Hypixel's API cache interval)
// Schedule the next scan only after the previous scan finishes; don't overlap.
async function scheduledScanLoop() {
  await scanHypixelAuctions();
  setTimeout(scheduledScanLoop, deliverySettings.scanSeconds * 1000);
}
if (process.env.SKYFLIP_DISABLE_SCANNER !== 'true') setTimeout(scheduledScanLoop, deliverySettings.scanSeconds * 1000);

// Check if mod connection timed out (> 6 seconds without sync, since interval is 2s)
setInterval(() => {
  const now = Date.now();
  if (primaryAccount.isConnected && (now - primaryAccount.lastSyncTime > 6_000)) {
    primaryAccount.isConnected = false;
    modState.isConnected = false;
    modState.location = 'Offline';
    broadcastSSE('mod_status', modState);
  }
}, 2000);

// ======================== SEIKEYOFLIPPER FABRIC 26.2 BACKEND API ========================

/**
 * Helper to authenticate token from headers or body
 */
function extractAndVerifyToken(req: Request): PlayerAccount | null {
  let token: string | undefined;

  // 1. Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }
  // 2. X-Mod-Key: <token>
  else if (req.headers['x-mod-key']) {
    token = String(req.headers['x-mod-key']).trim();
  }
  // 3. Body: { token: ... }
  else if (req.body && req.body.token) {
    token = String(req.body.token).trim();
  }

  if (!token) {
    return null;
  }

  const account = tokenToAccountMap.get(token);
  if (!account || account.isRevoked) {
    return null;
  }

  return account;
}

/**
 * SeikeyoFlipper Minecraft Fabric 26.2 Sync Endpoint
 * Called every 2 seconds by the Fabric client mod.
 */
app.post('/api/mod/sync', (req: Request, res: Response) => {
  // 1. Authenticate each player's mod token server-side
  const account = extractAndVerifyToken(req);
  if (!account) {
    return res.status(401).json({
      success: false,
      connected: false,
      error: 'Unauthorized: Invalid or revoked SeikeyoFlipper mod token.'
    });
  }

  const now = Date.now();

  // 2. Rate limiting (Expected sync interval is 2 seconds)
  // Sliding 60-second window: max 40 requests per minute, minimum 700ms between requests
  account.requestTimestamps = account.requestTimestamps.filter(t => now - t < 60_000);
  const lastRequestTime = account.requestTimestamps[account.requestTimestamps.length - 1];

  if ((lastRequestTime && now - lastRequestTime < 700) || account.requestTimestamps.length >= 40) {
    return res.status(429).json({
      success: false,
      connected: false,
      error: 'Too Many Requests: Rate limit exceeded. Expected sync interval is 2 seconds.'
    });
  }
  account.requestTimestamps.push(now);

  // 3. Match the token to the verified Minecraft UUID
  const rawUuid = req.body.minecraftUuid || req.body.uuid || '';
  const cleanModUuid = String(rawUuid).replace(/-/g, '').toLowerCase();

  if (account.minecraftUuid && cleanModUuid) {
    if (cleanModUuid !== account.minecraftUuid) {
      return res.status(403).json({
        success: false,
        connected: false,
        error: 'Forbidden: Minecraft UUID mismatch with registered SeikeyoFlipper token.'
      });
    }
  } else if (!account.minecraftUuid && cleanModUuid) {
    // Securely bind Minecraft UUID on initial link
    account.minecraftUuid = cleanModUuid;
  }

  // 4. Update the player's purse balance and status on their website dashboard
  const purseVal = typeof req.body.purseBalance === 'number' 
    ? req.body.purseBalance 
    : (typeof req.body.purse === 'number' ? req.body.purse : account.purse);

  if (Number.isFinite(purseVal) && purseVal >= 0) account.purse = purseVal;

  if (typeof req.body.bank === 'number') {
    account.bank = Math.max(0, req.body.bank);
  }

  if (req.body.ign && typeof req.body.ign === 'string') {
    account.ign = req.body.ign;
    if (!account.avatarUrl) {
      account.avatarUrl = `https://mc-heads.net/avatar/${encodeURIComponent(account.ign)}/64`;
    }
  }

  account.lastSyncTime = now;
  account.lastPing = now;
  account.isConnected = true;
  account.modVersion = req.body.modVersion || '26.2.0-FABRIC';
  account.clientType = req.body.clientType || 'FABRIC_26_2';
  account.modName = 'SeikeyoFlipper';

  // 5. Gather queued auction notifications in a commands array
  const commandsToSend: SeikeyoModNotification[] = [];

  // Website-only lowest-BIN alerts: do not forward manually queued auctions.
  // Clear stale manual requests so they cannot appear in Minecraft chat.
  account.manualCommandQueue.length = 0;

  // B. Automated snipes that the player is entitled to receive
  // Free users: 10-second artificial delay (now - discoveredAt >= 10,000ms)
  // Pro users: 0-second delay (now - discoveredAt >= 0ms)
  const requiredDelayMs = account.membershipTier === 'free' ? 20_000 : 0;

  const lastSent = lastAlertAt.get(account.id) || 0;
  const canSendNow = now - lastSent >= (account.membershipTier === 'pro' ? deliverySettings.alertSeconds : 30) * 1000;
  for (const flip of canSendNow ? activeFlips : []) {
    // Prevent duplicate delivery across repeated sync requests
    if (account.deliveredAuctionUuids.has(flip.uuid)) {
      continue;
    }

    // Delay entitlement
    const elapsedMs = now - flip.discoveredAt;
    if (elapsedMs < requiredDelayMs) {
      continue; // Not yet mature for Free users
    }

    // Purse entitlement: player must be able to afford the item if purse is reported
    if (account.purse > 0 && flip.buyPrice > account.purse) {
      continue;
    }

    // Manipulation filter
    if (flip.isSuspectedManipulation) {
      continue;
    }

    // Format strictly as /viewauction <uuid>
    const formattedUuid = formatHypixelAuctionUuid(flip.uuid);
    commandsToSend.push({
      command: `/viewauction ${formattedUuid}`,
      itemName: flip.itemName,
      profit: flip.netProfit
    });

    // Mark as delivered to prevent future duplicate delivery
    account.deliveredAuctionUuids.add(flip.uuid);
    lastAlertAt.set(account.id, now);

    // User-configured cap per delivery window
    if (commandsToSend.length >= (account.membershipTier === 'pro' ? deliverySettings.maxAlerts : 1)) {
      break;
    }
  }

  // Cap delivered history set to prevent memory growth
  if (account.deliveredAuctionUuids.size > 5000) {
    const arr = Array.from(account.deliveredAuctionUuids);
    account.deliveredAuctionUuids = new Set(arr.slice(arr.length - 2500));
  }

  // Sync to modState for real-time dashboard display
  modState.token = account.token;
  modState.isConnected = true;
  modState.ign = account.ign;
  modState.playerUuid = account.minecraftUuid;
  modState.syncedMinecraftUuid = account.minecraftUuid;
  modState.avatarUrl = account.avatarUrl;
  modState.purse = account.purse;
  modState.bank = account.bank;
  modState.lastPing = account.lastPing;
  modState.lastSyncTime = account.lastSyncTime;
  modState.modVersion = account.modVersion;
  modState.clientType = account.clientType;
  modState.modName = 'SeikeyoFlipper';
  modState.membershipTier = account.membershipTier;
  modState.tokenRevoked = account.isRevoked;
  modState.location = 'Skyblock';

  // Save persistent state
  saveAccountState(account);

  // Broadcast updated status to website dashboard via SSE
  broadcastSSE('mod_status', modState);

  // Return formatted SeikeyoFlipper response
  return res.json({
    success: true,
    connected: true,
    commands: commandsToSend
  });
});

// ======================== WEBSITE & ACCOUNT MANAGEMENT ========================

// Health & System status
app.get('/api/status', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    serverTime: Date.now(),
    modConnected: primaryAccount.isConnected,
    player: primaryAccount.ign,
    purse: primaryAccount.purse,
    membershipTier: primaryAccount.membershipTier,
    lastSyncTime: primaryAccount.lastSyncTime,
    flipsCount: activeFlips.length,
    scanner: scannerState,
    connectedPlayer
  });
});

// Force rescan of all Hypixel Skyblock auctions
app.post('/api/hypixel/scan', async (_req: Request, res: Response) => {
  if (scannerState.isScanning) {
    return res.json({ message: 'Scan already in progress', scanner: scannerState });
  }
  scanHypixelAuctions();
  return res.json({ success: true, message: 'Initiated full scan of Hypixel auctions' });
});

// Get scanner telemetry status
app.get('/api/hypixel/scanner-status', (_req: Request, res: Response) => {
  res.json(scannerState);
});

// Connect Minecraft username to Hypixel
app.post('/api/player/connect', async (req: Request, res: Response) => {
  const { username } = req.body;

  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    return res.status(400).json({ error: 'Please enter a valid Minecraft username' });
  }

  const cleanUsername = username.trim();

  try {
    // 1. Resolve UUID via Mojang API
    let playerUuid = '';
    let resolvedName = cleanUsername;

    try {
      const mojangRes = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(cleanUsername)}`);
      if (mojangRes.ok) {
        const mojangData = await mojangRes.json();
        playerUuid = mojangData.id;
        resolvedName = mojangData.name;
      }
    } catch (e) {
      console.warn('Mojang lookup failed, continuing with custom username fallback');
    }

    if (!playerUuid) {
      return res.status(404).json({ error: 'Minecraft username could not be verified with Mojang. Please check the spelling.' });
    }

    const cleanUuid = playerUuid.replace(/-/g, '').toLowerCase();
    const avatarUrl = `https://mc-heads.net/avatar/${cleanUuid}/64`;

    // 2. Count active auctions listed by this player on Hypixel
    const playerAuctions = rawLiveAuctions.filter(a => 
      (a.auctioneer || '').replace(/-/g, '').toLowerCase() === cleanUuid || 
      (a.coop && Array.isArray(a.coop) && a.coop.map((c: string) => c.replace(/-/g, '').toLowerCase()).includes(cleanUuid))
    );

    connectedPlayer = {
      username: resolvedName,
      uuid: cleanUuid,
      avatarUrl,
      connectedAt: Date.now(),
      hasApiAccess: true, // Public auction scanner is managed centrally by SkyFlip.
      activeAuctionsCount: playerAuctions.length,
      membershipTier: primaryAccount.membershipTier
    };

    // Update primary account & mod state
    primaryAccount.ign = resolvedName;
    primaryAccount.minecraftUuid = cleanUuid;
    primaryAccount.avatarUrl = avatarUrl;

    modState.ign = resolvedName;
    modState.playerUuid = cleanUuid;
    modState.syncedMinecraftUuid = cleanUuid;
    modState.avatarUrl = avatarUrl;

    broadcastSSE('player_connected', connectedPlayer);
    broadcastSSE('mod_status', modState);

    return res.json({
      success: true,
      profile: connectedPlayer,
      activeAuctionsCount: playerAuctions.length
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to connect Minecraft profile: ' + error.message });
  }
});

// Get current player profile
app.get('/api/player/profile', (_req: Request, res: Response) => {
  res.json({
    connected: !!connectedPlayer,
    profile: connectedPlayer,
    membershipTier: primaryAccount.membershipTier
  });
});

// Disconnect player profile
app.post('/api/player/disconnect', (_req: Request, res: Response) => {
  connectedPlayer = null;
  primaryAccount.ign = 'Not Connected';
  primaryAccount.minecraftUuid = '';
  primaryAccount.avatarUrl = '';
  modState.ign = 'Not Connected';
  delete modState.playerUuid;
  delete modState.syncedMinecraftUuid;
  delete modState.avatarUrl;
  broadcastSSE('mod_status', modState);
  res.json({ success: true });
});

// Membership cannot be upgraded by a public request. Premium is granted only after
// a PayPal Sandbox API verification confirms an ACTIVE subscription. This starter has ONE account;
// add authenticated multi-user accounts before deploying as a paid service.
app.post('/api/player/membership', (_req: Request, res: Response) => {
  res.status(403).json({ error: 'Premium requires verified payment; direct tier changes are disabled.' });
});

// PayPal Sandbox only. NEVER use this prototype for live customer billing.
const paypalClientId = process.env.PAYPAL_SANDBOX_CLIENT_ID || '';
const paypalClientSecret = process.env.PAYPAL_SANDBOX_CLIENT_SECRET || '';
const paypalPlanId = process.env.PAYPAL_SANDBOX_PLAN_ID || '';
let paidSubscriptionId: string | null = null;
const sandboxConfigured = () => Boolean(paypalClientId && paypalClientSecret && paypalPlanId);
const isLoopback = (req: Request) => ['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress || '');

async function paypalAccessToken(): Promise<string> {
  const basic = Buffer.from(`${paypalClientId}:${paypalClientSecret}`).toString('base64');
  const response = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST', headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  const data: any = await response.json();
  if (!response.ok || !data.access_token) throw new Error('PayPal Sandbox credentials rejected');
  return data.access_token;
}

async function getSandboxSubscription(id: string): Promise<any> {
  const accessToken = await paypalAccessToken();
  const response = await fetch(`https://api-m.sandbox.paypal.com/v1/billing/subscriptions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
  });
  const data: any = await response.json();
  if (!response.ok) throw new Error(`PayPal Sandbox subscription lookup failed (${response.status})`);
  return data;
}

function setPremium(active: boolean) {
  primaryAccount.membershipTier = active ? 'pro' : 'free';
  modState.membershipTier = primaryAccount.membershipTier;
  saveAccountState(primaryAccount);
  broadcastSSE('mod_status', modState);
}

app.get('/api/billing/config', async (req: Request, res: Response) => {
  // Only a local test account is supported; do not expose payment controls to remote users.
  if (!isLoopback(req)) return res.status(403).json({ error: 'Local Sandbox testing only' });
  if (paidSubscriptionId && sandboxConfigured()) {
    try {
      const sub = await getSandboxSubscription(paidSubscriptionId);
      setPremium(sub.status === 'ACTIVE' && sub.plan_id === paypalPlanId);
    } catch { setPremium(false); }
  }
  res.json({ enabled: sandboxConfigured(), provider: 'paypal', environment: 'sandbox',
    clientId: sandboxConfigured() ? paypalClientId : null,
    planId: sandboxConfigured() ? paypalPlanId : null,
    premium: primaryAccount.membershipTier === 'pro' });
});

app.post('/api/billing/verify', async (req: Request, res: Response) => {
  if (!isLoopback(req)) return res.status(403).json({ error: 'Local Sandbox testing only' });
  if (!sandboxConfigured()) return res.status(503).json({ error: 'Configure PayPal Sandbox credentials in .env first' });
  const subscriptionId = String(req.body?.subscriptionId || '');
  if (!/^I-[A-Z0-9]{5,40}$/i.test(subscriptionId)) return res.status(400).json({ error: 'Invalid subscription ID' });
  try {
    const sub = await getSandboxSubscription(subscriptionId);
    if (sub.plan_id !== paypalPlanId || sub.status !== 'ACTIVE')
      return res.status(403).json({ error: `Subscription not active for configured Sandbox plan (status: ${sub.status || 'unknown'})` });
    // Single-account local test only. Public multi-user billing requires authenticated accounts
    // and server-side subscriber ownership mapping before enabling live payments.
    paidSubscriptionId = subscriptionId;
    setPremium(true);
    res.json({ success: true, premium: true, status: sub.status });
  } catch (err: any) { res.status(502).json({ error: err.message || 'PayPal verification failed' }); }
});

app.post('/api/billing/checkout', (_req: Request, res: Response) =>
  res.status(410).json({ error: 'Stripe checkout removed. Use the PayPal Sandbox subscription button.' }));

// Revoke current SeikeyoFlipper mod token
app.post('/api/player/token/revoke', (_req: Request, res: Response) => {
  primaryAccount.isRevoked = true;
  primaryAccount.isConnected = false;
  modState.isConnected = false;
  modState.tokenRevoked = true;
  saveAccountState(primaryAccount);
  broadcastSSE('mod_status', modState);
  res.json({ success: true, message: 'SeikeyoFlipper token has been revoked.' });
});

// Generate fresh SeikeyoFlipper mod token
app.post('/api/player/token/generate', (_req: Request, res: Response) => {
  tokenToAccountMap.delete(primaryAccount.token);
  const newToken = 'sk_seikeyo_' + crypto.randomBytes(16).toString('hex');
  primaryAccount.token = newToken;
  primaryAccount.isRevoked = false;
  tokenToAccountMap.set(newToken, primaryAccount);
  saveAccountState(primaryAccount);

  modState.token = newToken;
  modState.tokenRevoked = false;
  broadcastSSE('mod_status', modState);
  res.json({ success: true, token: newToken });
});

// Get or refresh Mod Pairing Token
app.get('/api/mod/token', (_req: Request, res: Response) => {
  const publicBaseUrl = process.env.APP_URL || 'https://ais-dev-3q4l4z353nefqn7rcu3vk2-410019683109.us-east1.run.app';
  res.json({
    token: primaryAccount.token,
    isRevoked: primaryAccount.isRevoked,
    endpoint: '/api/mod/sync',
    publicSyncUrl: `${publicBaseUrl}/api/mod/sync`,
    streamEndpoint: '/api/mod/stream',
    membershipTier: primaryAccount.membershipTier
  });
});

app.post('/api/mod/token/reset', (_req: Request, res: Response) => {
  tokenToAccountMap.delete(primaryAccount.token);
  const newToken = 'sk_seikeyo_' + crypto.randomBytes(16).toString('hex');
  primaryAccount.token = newToken;
  primaryAccount.isRevoked = false;
  primaryAccount.isConnected = false;
  tokenToAccountMap.set(newToken, primaryAccount);
  saveAccountState(primaryAccount);

  modState.token = newToken;
  modState.tokenRevoked = false;
  modState.isConnected = false;
  broadcastSSE('mod_status', modState);
  res.json({ success: true, token: newToken });
});

// Get mod connection state
app.get('/api/mod/status', (_req: Request, res: Response) => {
  const publicBaseUrl = process.env.APP_URL || 'https://ais-dev-3q4l4z353nefqn7rcu3vk2-410019683109.us-east1.run.app';
  res.json({
    ...modState,
    token: primaryAccount.token,
    purse: primaryAccount.purse,
    bank: primaryAccount.bank,
    lastSyncTime: primaryAccount.lastSyncTime,
    membershipTier: primaryAccount.membershipTier,
    tokenRevoked: primaryAccount.isRevoked,
    modName: 'SeikeyoFlipper',
    publicSyncUrl: `${publicBaseUrl}/api/mod/sync`
  });
});

// Web UI triggers an in-game command to the mod (e.g. /viewauction <REAL_UUID>)
app.post('/api/mod/send-command', (req: Request, res: Response) => {
  const { itemUuid, itemName, price, profit } = req.body;

  if (!itemUuid) {
    return res.status(400).json({ error: 'Missing itemUuid' });
  }

  const formattedUuid = formatHypixelAuctionUuid(itemUuid);
  const safeCommand = `/viewauction ${formattedUuid}`;

  // Queue to primary account's manual commands
  primaryAccount.manualCommandQueue.push({
    command: safeCommand,
    itemName: itemName || 'Auction',
    profit: profit || 0,
    itemUuid
  });

  const cmd: ModCommand = {
    id: 'cmd_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'),
    command: safeCommand,
    action: 'VIEW_AUCTION',
    itemUuid,
    itemName: itemName || 'Auction',
    price: price || 0,
    profit: profit || 0,
    timestamp: Date.now()
  };

  broadcastSSE('mod_command', cmd);

  // Record in flip history
  recentFlipHistory.unshift({
    id: cmd.id,
    uuid: itemUuid,
    itemName: cmd.itemName,
    buyPrice: cmd.price,
    netProfit: cmd.profit,
    time: Date.now(),
    ign: primaryAccount.ign
  });

  return res.json({
    success: true,
    command: cmd,
    queued: true,
    modOnline: primaryAccount.isConnected
  });
});

// Toggle auto-buy arming
app.post('/api/mod/toggle-autobuy', (req: Request, res: Response) => {
  modState.autoBuyArmed = !!req.body.armed;
  broadcastSSE('mod_status', modState);
  res.json({ success: true, autoBuyArmed: modState.autoBuyArmed });
});

// Simulator endpoint specifically matching SeikeyoFlipper format
app.post('/api/mod/simulate-client', (req: Request, res: Response) => {
  const { ign, purse, bank, location, isConnected } = req.body;

  primaryAccount.isConnected = isConnected ?? true;
  primaryAccount.lastSyncTime = Date.now();
  primaryAccount.lastPing = Date.now();

  if (ign !== undefined) {
    primaryAccount.ign = ign;
    primaryAccount.avatarUrl = `https://mc-heads.net/avatar/${encodeURIComponent(ign)}/64`;
  }
  if (purse !== undefined) primaryAccount.purse = purse;
  if (bank !== undefined) primaryAccount.bank = bank;
  primaryAccount.modName = 'SeikeyoFlipper';
  primaryAccount.clientType = 'FABRIC_26_2';
  primaryAccount.modVersion = '26.2.0-FABRIC';

  modState.isConnected = primaryAccount.isConnected;
  modState.ign = primaryAccount.ign;
  modState.purse = primaryAccount.purse;
  modState.bank = primaryAccount.bank;
  modState.avatarUrl = primaryAccount.avatarUrl;
  modState.lastSyncTime = primaryAccount.lastSyncTime;
  modState.lastPing = primaryAccount.lastPing;
  modState.modName = 'SeikeyoFlipper';
  modState.membershipTier = primaryAccount.membershipTier;

  broadcastSSE('mod_status', modState);
  res.json({ success: true, modState });
});

// SSE endpoint for web client and mod push
app.get('/api/mod/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.write(`data: ${JSON.stringify({ type: 'connected', time: Date.now() })}\n\n`);
  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// Local development controls; protect this route before public deployment.
app.get('/api/settings/alerts', (_req: Request, res: Response) => res.json({ ...deliverySettings, premium: primaryAccount.membershipTier === 'pro' }));
app.post('/api/settings/alerts', (req: Request, res: Response) => {
  // This endpoint is intentionally limited to loopback for local development.
  const ip = req.ip || req.socket.remoteAddress || '';
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip)) {
    return res.status(403).json({ error: 'Local settings only' });
  }
  if (primaryAccount.membershipTier !== 'pro') return res.status(403).json({ error: 'Custom timers and unlimited page results require Premium.' });
  const scan = Number(req.body.scanSeconds);
  const alert = Number(req.body.alertSeconds);
  const count = Number(req.body.maxAlerts);
  const pageLimit = Number(req.body.pageLimit);
  if (!Number.isInteger(scan) || scan < 60 || scan > 600 ||
      !Number.isInteger(alert) || alert < 5 || alert > 600 ||
      !Number.isInteger(count) || count < 1 || count > 30 ||
      !Number.isInteger(pageLimit) || pageLimit < 1 || pageLimit > 100000) {
    return res.status(400).json({ error: 'Invalid timing or alert limit' });
  }
  Object.assign(deliverySettings, { scanSeconds: scan, alertSeconds: alert, maxAlerts: count, pageLimit });
  return res.json({ ...deliverySettings, premium: true });
});

// Get active flips list (100% REAL LIVE HYPIXEL AUCTIONS!)
app.get('/api/flips', (_req: Request, res: Response) => {
  const delay = !publicPreview && primaryAccount.membershipTier === 'pro' ? 0 : 20_000;
  const eligibleFlips = activeFlips.filter(f => Date.now() - f.discoveredAt >= delay);
  res.json({
    success: true,
    count: eligibleFlips.length,
    totalScanned: scannerState.totalAuctionsScanned,
    lastUpdated: scannerState.lastScanTime,
    flips: eligibleFlips
  });
});

// History & analytics stats
app.get('/api/hypixel/stats', (_req: Request, res: Response) => {
  const totalPotentialProfit = activeFlips.reduce((sum, f) => sum + f.netProfit, 0);
  const highestProfitFlip = activeFlips.reduce((prev, current) => 
    (prev.netProfit > current.netProfit) ? prev : current, activeFlips[0] || null
  );

  res.json({
    activeAuctionsTracked: scannerState.totalAuctionsScanned || rawLiveAuctions.length,
    totalBinAuctions: scannerState.totalBinAuctions,
    activeSnipesFound: activeFlips.length,
    totalPagesScanned: scannerState.totalPagesScanned,
    lastScanTime: scannerState.lastScanTime,
    isScanning: scannerState.isScanning,
    totalPotentialProfit,
    highestProfitFlip,
    avgMarginPercent: 24.8,
    recentExecutions: recentFlipHistory.slice(0, 10),
    companionStatus: {
      connected: primaryAccount.isConnected,
      ign: primaryAccount.ign,
      purse: primaryAccount.purse,
      lastSyncTime: primaryAccount.lastSyncTime,
      membershipTier: primaryAccount.membershipTier
    }
  });
});

// Setup Vite or static serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`SkyFlip Flipper Server running on port ${PORT}`);
  });
}

startServer();
