export function formatCoins(num: number, compact: boolean = false): string {
  if (num === undefined || num === null || isNaN(num)) return '0';

  if (compact) {
    if (Math.abs(num) >= 1_000_000_000) {
      return (num / 1_000_000_000).toFixed(2) + 'B';
    }
    if (Math.abs(num) >= 1_000_000) {
      return (num / 1_000_000).toFixed(2) + 'M';
    }
    if (Math.abs(num) >= 1_000) {
      return (num / 1_000).toFixed(1) + 'k';
    }
    return num.toLocaleString();
  }

  return num.toLocaleString();
}

export function formatTimeRemaining(targetTimestamp: number): string {
  const remainingSeconds = Math.max(0, Math.floor((targetTimestamp - Date.now()) / 1000));
  if (remainingSeconds <= 0) return 'Ended';

  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
}

export function formatSyncTime(timestamp: number): string {
  if (!timestamp || timestamp <= 0) return 'Never synced';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 2) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  return `${diffMin}m ago`;
}

// Convert Minecraft color codes (§0 to §f, §l, etc.) into styled HTML/React elements
export const MINECRAFT_COLORS: Record<string, string> = {
  '0': '#000000', // Black
  '1': '#0000AA', // Dark Blue
  '2': '#00AA00', // Dark Green
  '3': '#00AAAA', // Dark Aqua
  '4': '#AA0000', // Dark Red
  '5': '#AA00AA', // Dark Purple
  '6': '#FFAA00', // Gold
  '7': '#AAAAAA', // Gray
  '8': '#555555', // Dark Gray
  '9': '#5555FF', // Blue
  'a': '#55FF55', // Green
  'b': '#55FFFF', // Aqua
  'c': '#FF5555', // Red
  'd': '#FF55FF', // Light Purple
  'e': '#FFFF55', // Yellow
  'f': '#FFFFFF', // White
};

export interface LoreSpan {
  text: string;
  color?: string;
  bold?: boolean;
}

export function parseMinecraftLore(text: string): LoreSpan[] {
  const parts = text.split('§');
  if (parts.length === 1) {
    return [{ text: parts[0], color: '#AAAAAA' }];
  }

  const result: LoreSpan[] = [];
  let currentColor = '#AAAAAA';
  let isBold = false;

  // Handle first segment if it didn't start with §
  if (parts[0].length > 0) {
    result.push({ text: parts[0], color: currentColor, bold: isBold });
  }

  for (let i = 1; i < parts.length; i++) {
    const segment = parts[i];
    if (!segment) continue;

    const code = segment[0].toLowerCase();
    const content = segment.slice(1);

    if (MINECRAFT_COLORS[code]) {
      currentColor = MINECRAFT_COLORS[code];
      isBold = false;
    } else if (code === 'l') {
      isBold = true;
    } else if (code === 'r') {
      currentColor = '#AAAAAA';
      isBold = false;
    }

    if (content.length > 0) {
      result.push({
        text: content,
        color: currentColor,
        bold: isBold
      });
    }
  }

  return result;
}

export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'COMMON': return '#FFFFFF';
    case 'UNCOMMON': return '#55FF55';
    case 'RARE': return '#55FFFF';
    case 'EPIC': return '#AA00AA';
    case 'LEGENDARY': return '#FFAA00';
    case 'MYTHIC': return '#FF55FF';
    case 'DIVINE': return '#00AAAA';
    case 'SPECIAL': return '#FF5555';
    default: return '#AAAAAA';
  }
}

export function getRarityBorderColor(rarity: string): string {
  switch (rarity) {
    case 'COMMON': return 'border-white/20';
    case 'UNCOMMON': return 'border-emerald-500/40';
    case 'RARE': return 'border-cyan-500/40';
    case 'EPIC': return 'border-purple-500/40';
    case 'LEGENDARY': return 'border-amber-500/50';
    case 'MYTHIC': return 'border-pink-500/50';
    case 'DIVINE': return 'border-teal-400/60';
    case 'SPECIAL': return 'border-rose-500/50';
    default: return 'border-slate-800';
  }
}
