export type Rarity = 
  | 'COMMON' 
  | 'UNCOMMON' 
  | 'RARE' 
  | 'EPIC' 
  | 'LEGENDARY' 
  | 'MYTHIC' 
  | 'DIVINE' 
  | 'SPECIAL';

export type ItemCategory = 
  | 'WEAPONS' 
  | 'ARMOR' 
  | 'ACCESSORIES' 
  | 'PETS' 
  | 'MINING' 
  | 'CONSUMABLES' 
  | 'MISC';

export type DemandVolume = 'HIGH' | 'MEDIUM' | 'LOW';

export interface AuctionFlip {
  id: string;
  uuid: string; // Hypixel Auction UUID
  itemName: string;
  category: ItemCategory;
  rarity: Rarity;
  stars?: number;
  isMasterStars?: boolean;
  masterStars?: number;
  isRecombobulated: boolean;
  buyPrice: number;
  lbin: number; // Lowest Buy-It-Now price on market
  targetPrice: number; // 2nd lowest or market average
  estimatedValue: number;
  taxAmount: number;
  netProfit: number;
  profitMargin: number; // e.g. 24.5%
  seller: string;
  endsAt: number;
  listedAt: number;
  lore: string[];
  enchantments?: string[];
  attributes?: Record<string, number>;
  gemstones?: string[];
  petInfo?: {
    level: number;
    heldItem?: string;
    candyCount?: number;
  };
  demand: DemandVolume;
  isSuspectedManipulation?: boolean;
  manipulationWarningReason?: string;
  auctionType: 'BIN';
  discoveredAt: number; // For Free (10s delay) vs Pro (0s instant)
}

export type MembershipTier = 'free' | 'pro';

export interface SeikeyoModNotification {
  command: string; // e.g. "/viewauction 12345678-1234-1234-1234-123456789abc"
  itemName: string;
  profit: number;
}

export interface PlayerProfile {
  username: string;
  uuid: string;
  avatarUrl: string;
  connectedAt: number;
  hasApiAccess: boolean;
  activeAuctionsCount: number;
  membershipTier: MembershipTier;
}

export interface ScannerState {
  isScanning: boolean;
  lastScanTime: number;
  totalAuctionsScanned: number;
  totalPagesScanned: number;
  totalBinAuctions: number;
  activeSnipesCount: number;
  scanProgress: number; // 0 to 100
}

export interface ModConnectionState {
  token: string;
  isConnected: boolean;
  ign: string;
  playerUuid?: string;
  syncedMinecraftUuid?: string;
  avatarUrl?: string;
  purse: number;
  bank: number;
  location: string;
  lastPing: number;
  lastSyncTime: number;
  modVersion: string;
  clientType: string;
  modName: string;
  membershipTier: MembershipTier;
  tokenRevoked?: boolean;
  ipAddress?: string;
  autoBuyArmed?: boolean;
}

export interface ModCommand {
  id: string;
  command: string; // e.g. "/viewauction 5a9b...
  action: 'VIEW_AUCTION' | 'AUTO_BUY' | 'ALERT';
  itemUuid: string;
  itemName: string;
  price: number;
  profit: number;
  timestamp: number;
}

export interface PortfolioFlip {
  id: string;
  auctionUuid: string;
  itemName: string;
  rarity: Rarity;
  buyPrice: number;
  sellPrice?: number;
  estimatedProfit: number;
  actualProfit?: number;
  status: 'BOUGHT' | 'LISTED' | 'SOLD' | 'MISSED';
  boughtAt: number;
  soldAt?: number;
}

export interface FilterSettings {
  minProfit: number;
  minMarginPercent: number;
  maxBudget: number;
  usePurseAsBudget: boolean;
  selectedCategories: ItemCategory[];
  selectedRarities: Rarity[];
  hideManipulations: boolean;
  minDemand: 'ALL' | 'MEDIUM_PLUS' | 'HIGH_ONLY';
  soundAlerts: boolean;
  soundVolume: number;
  autoSendToMod: boolean;
}
