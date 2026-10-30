import React, { useState } from 'react';
import { formatCoins } from '../utils/formatters';
import { Crosshair, Search, Flame, TrendingDown, ArrowUpRight } from 'lucide-react';

interface TargetItem {
  name: string;
  category: string;
  rarity: string;
  rarityColor: string;
  lbin: number;
  avg7d: number;
  snipeThreshold: number;
  estProfit: number;
  volume24h: number;
  volatility: 'LOW' | 'MEDIUM' | 'HIGH';
}

const MATRIX_TARGETS: TargetItem[] = [
  {
    name: "Hyperion ✪✪✪✪✪",
    category: "Weapons",
    rarity: "MYTHIC",
    rarityColor: "#FF55FF",
    lbin: 1_720_000_000,
    avg7d: 1_760_000_000,
    snipeThreshold: 1_550_000_000,
    estProfit: 165_000_000,
    volume24h: 38,
    volatility: "MEDIUM"
  },
  {
    name: "Terminator ✪✪✪✪✪",
    category: "Weapons",
    rarity: "MYTHIC",
    rarityColor: "#FF55FF",
    lbin: 975_000_000,
    avg7d: 995_000_000,
    snipeThreshold: 880_000_000,
    estProfit: 75_000_000,
    volume24h: 54,
    volatility: "MEDIUM"
  },
  {
    name: "Judgment Core",
    category: "Misc / Crafting",
    rarity: "LEGENDARY",
    rarityColor: "#FFAA00",
    lbin: 485_000_000,
    avg7d: 495_000_000,
    snipeThreshold: 430_000_000,
    estProfit: 45_000_000,
    volume24h: 72,
    volatility: "LOW"
  },
  {
    name: "Golden Dragon [Lvl 100]",
    category: "Pets",
    rarity: "LEGENDARY",
    rarityColor: "#FFAA00",
    lbin: 1_220_000_000,
    avg7d: 1_280_000_000,
    snipeThreshold: 1_100_000_000,
    estProfit: 95_000_000,
    volume24h: 18,
    volatility: "HIGH"
  },
  {
    name: "Warden Helmet",
    category: "Armor",
    rarity: "LEGENDARY",
    rarityColor: "#FFAA00",
    lbin: 278_000_000,
    avg7d: 285_000_000,
    snipeThreshold: 245_000_000,
    estProfit: 27_000_000,
    volume24h: 92,
    volatility: "LOW"
  },
  {
    name: "Divan's Chestplate",
    category: "Mining",
    rarity: "MYTHIC",
    rarityColor: "#FF55FF",
    lbin: 142_000_000,
    avg7d: 149_000_000,
    snipeThreshold: 122_000_000,
    estProfit: 17_000_000,
    volume24h: 110,
    volatility: "LOW"
  },
  {
    name: "Giant's Sword ✪✪✪✪✪",
    category: "Weapons",
    rarity: "LEGENDARY",
    rarityColor: "#FFAA00",
    lbin: 182_000_000,
    avg7d: 188_000_000,
    snipeThreshold: 155_000_000,
    estProfit: 23_000_000,
    volume24h: 140,
    volatility: "MEDIUM"
  },
  {
    name: "Necron's Chestplate ✪✪✪✪✪",
    category: "Armor",
    rarity: "LEGENDARY",
    rarityColor: "#FFAA00",
    lbin: 94_000_000,
    avg7d: 98_000_000,
    snipeThreshold: 78_000_000,
    estProfit: 14_000_000,
    volume24h: 215,
    volatility: "LOW"
  },
  {
    name: "Overflux Power Orb",
    category: "Consumables",
    rarity: "EPIC",
    rarityColor: "#AA00AA",
    lbin: 71_500_000,
    avg7d: 74_000_000,
    snipeThreshold: 59_000_000,
    estProfit: 11_000_000,
    volume24h: 180,
    volatility: "LOW"
  },
  {
    name: "Recombobulator 3000",
    category: "Misc",
    rarity: "LEGENDARY",
    rarityColor: "#FFAA00",
    lbin: 10_750_000,
    avg7d: 10_900_000,
    snipeThreshold: 9_200_000,
    estProfit: 1_400_000,
    volume24h: 840,
    volatility: "LOW"
  }
];

export const TargetMatrixView: React.FC = () => {
  const [search, setSearch] = useState('');

  const filtered = MATRIX_TARGETS.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Crosshair className="w-6 h-6 text-amber-400" />
            High-Liquidity Skyblock Target Matrix
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Reference fair market values and calibrated snipe price thresholds for the fastest-selling items on Hypixel AH.
          </p>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter matrix items..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Target Table */}
      <div className="bg-[#121824] border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0f1420] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Current LBIN</th>
                <th className="py-3 px-4 text-right">7-Day Avg</th>
                <th className="py-3 px-4 text-right">Snipe Threshold</th>
                <th className="py-3 px-4 text-right">Target Net Profit</th>
                <th className="py-3 px-4 text-right">24h Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
              {filtered.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-900/60 transition-colors">
                  <td className="py-3 px-4 font-sans font-bold" style={{ color: item.rarityColor }}>
                    {item.name}
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-400">
                    {item.category}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-white font-bold">
                    {formatCoins(item.lbin)}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-slate-400">
                    {formatCoins(item.avg7d)}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-amber-300 font-bold">
                    ≤ {formatCoins(item.snipeThreshold)}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums font-bold text-emerald-400">
                    +{formatCoins(item.estProfit)}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-slate-300">
                    {item.volume24h} sold/day
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
