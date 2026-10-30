import React from 'react';
import { FilterSettings, ItemCategory } from '../types/skyblock';
import { formatCoins } from '../utils/formatters';
import { Volume2, VolumeX, ShieldAlert, Sparkles, DollarSign, Filter, Search } from 'lucide-react';

interface FilterBarProps {
  filters: FilterSettings;
  setFilters: React.Dispatch<React.SetStateAction<FilterSettings>>;
  onTestSound: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  playerPurse: number;
}

const CATEGORIES: { id: ItemCategory | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'All Items' },
  { id: 'WEAPONS', label: 'Weapons' },
  { id: 'ARMOR', label: 'Armor' },
  { id: 'ACCESSORIES', label: 'Accessories' },
  { id: 'PETS', label: 'Pets' },
  { id: 'MINING', label: 'Mining' },
  { id: 'CONSUMABLES', label: 'Consumables' },
];

const PROFIT_PRESETS = [
  { label: 'Any Profit', value: 0 },
  { label: '500k+', value: 500_000 },
  { label: '2M+', value: 2_000_000 },
  { label: '10M+', value: 10_000_000 },
  { label: '50M+', value: 50_000_000 },
];

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  setFilters,
  onTestSound,
  searchQuery,
  setSearchQuery,
  playerPurse
}) => {
  const activeCategory = filters.selectedCategories.length === 0 ? 'ALL' : filters.selectedCategories[0];

  const handleSelectCategory = (cat: ItemCategory | 'ALL') => {
    if (cat === 'ALL') {
      setFilters(prev => ({ ...prev, selectedCategories: [] }));
    } else {
      setFilters(prev => ({ ...prev, selectedCategories: [cat] }));
    }
  };

  return (
    <div className="bg-[#0f1420] border-b border-slate-800 p-4 space-y-3.5">
      {/* Top row: Search, Category Buttons, Safe Mode, Sound Alert */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative min-w-[240px] flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items (e.g. Hyperion, Divan, Pet)..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        {/* Categories (Functional segmented buttons) */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-full">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleSelectCategory(cat.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeCategory === cat.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Toggles: Safe mode & Sound */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilters(prev => ({ ...prev, hideManipulations: !prev.hideManipulations }))}
            className={`text-xs px-2.5 py-1 rounded-md border transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              filters.hideManipulations
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Automatically filter out low volume manipulation traps"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
            Anti-Manip Safe Mode
          </button>

          <button
            onClick={() => setFilters(prev => ({ ...prev, soundAlerts: !prev.soundAlerts }))}
            className={`text-xs px-2.5 py-1 rounded-md border transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              filters.soundAlerts
                ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300'
            }`}
            title="Play authentic Minecraft chime on new flip"
          >
            {filters.soundAlerts ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            Alert Chime
          </button>

          {filters.soundAlerts && (
            <button
              onClick={onTestSound}
              className="text-[11px] px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 whitespace-nowrap"
            >
              Test Ding
            </button>
          )}
        </div>
      </div>

      {/* Bottom row: Min Profit Presets, Min Margin %, and Max Budget */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800/70 text-xs">
        {/* Min Profit Presets */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-slate-500" />
            Min Profit:
          </span>
          <div className="flex items-center gap-1">
            {PROFIT_PRESETS.map(preset => (
              <button
                key={preset.value}
                onClick={() => setFilters(prev => ({ ...prev, minProfit: preset.value }))}
                className={`px-2 py-0.5 rounded text-xs transition-colors tabular-nums ${
                  filters.minProfit === preset.value
                    ? 'bg-slate-200 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Min Margin % */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-slate-500" />
            Min Margin:
          </span>
          {[0, 10, 20, 35].map(pct => (
            <button
              key={pct}
              onClick={() => setFilters(prev => ({ ...prev, minMarginPercent: pct }))}
              className={`px-2 py-0.5 rounded text-xs transition-colors tabular-nums ${
                filters.minMarginPercent === pct
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900'
              }`}
            >
              {pct === 0 ? 'Any %' : `${pct}%+`}
            </button>
          ))}
        </div>

        {/* Max Budget Filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Max Budget:</span>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={filters.maxBudget === 0 ? '' : filters.maxBudget}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setFilters(prev => ({ ...prev, maxBudget: isNaN(val) ? 0 : val }));
              }}
              placeholder="No limit"
              className="w-28 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 tabular-nums font-mono"
            />
            {playerPurse > 0 && (
              <button
                onClick={() => setFilters(prev => ({ ...prev, maxBudget: playerPurse }))}
                className="text-[11px] px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded border border-slate-700 whitespace-nowrap"
                title={`Set max budget to purse: ${formatCoins(playerPurse)}`}
              >
                Purse ({formatCoins(playerPurse, true)})
              </button>
            )}
            {filters.maxBudget > 0 && (
              <button
                onClick={() => setFilters(prev => ({ ...prev, maxBudget: 0 }))}
                className="text-[10px] text-slate-500 hover:text-slate-300 underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
