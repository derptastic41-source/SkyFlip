import React from 'react';
import { ModConnectionState, PlayerProfile, ScannerState, MembershipTier } from '../types/skyblock';
import { formatCoins, formatSyncTime } from '../utils/formatters';
import { 
  ShieldCheck, ShieldAlert, Coins, MapPin, Zap, RefreshCw, 
  Terminal, User, Loader2, Sparkles, Clock, Crown 
} from 'lucide-react';

interface ModStatusBannerProps {
  modState: ModConnectionState;
  playerProfile: PlayerProfile | null;
  scannerState: ScannerState;
  onSetBudgetToPurse: () => void;
  onToggleAutoBuy: () => void;
  onOpenSimulator: () => void;
  onOpenPlayerModal: () => void;
  onTriggerScan: () => void;
  onToggleMembership: (tier: MembershipTier) => void;
}

export const ModStatusBanner: React.FC<ModStatusBannerProps> = ({
  modState,
  playerProfile,
  scannerState,
  onSetBudgetToPurse,
  onToggleAutoBuy,
  onOpenSimulator,
  onOpenPlayerModal,
  onTriggerScan,
  onToggleMembership
}) => {
  const isPro = modState.membershipTier === 'pro';

  return (
    <div className="bg-[#121824] border-b border-slate-800 px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Left: Player Profile & SeikeyoFlipper Mod State */}
        <div className="flex items-center gap-3 text-xs flex-wrap">
          {/* Player avatar & click to edit */}
          <button
            onClick={onOpenPlayerModal}
            title="Click to connect or change Minecraft username"
            className="flex items-center gap-2 hover:opacity-90 transition-opacity text-left shrink-0"
          >
            {playerProfile ? (
              <img
                src={playerProfile.avatarUrl}
                alt={playerProfile.username}
                className="w-6 h-6 rounded bg-slate-800 border border-amber-500/50 shadow-sm"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-6 h-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
            <span className="text-white font-mono font-bold hover:text-amber-300 transition-colors">
              {playerProfile ? playerProfile.username : (modState.ign !== 'Not Connected' ? modState.ign : 'Connect IGN')}
            </span>
          </button>

          <span className="text-slate-600" aria-hidden="true">·</span>

          {/* SeikeyoFlipper Fabric 26.2 Mod Connection Status */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold">
              SeikeyoFlipper 26.2
            </span>
            {modState.isConnected ? (
              <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Mod Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-500 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-slate-600" />
                Mod Offline
              </span>
            )}
          </div>

          <span className="text-slate-600" aria-hidden="true">·</span>

          {/* Last Synchronization Time */}
          <div className="flex items-center gap-1 text-slate-400 text-[11px] shrink-0" title={`Last Sync: ${modState.lastSyncTime ? new Date(modState.lastSyncTime).toLocaleTimeString() : 'Never'}`}>
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Sync: <strong className="text-slate-200 font-mono">{formatSyncTime(modState.lastSyncTime)}</strong></span>
          </div>

          <span className="text-slate-600" aria-hidden="true">·</span>

          {/* Membership Status Badge with 1-click tier switcher */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isPro ? (
              <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1">
                <Crown className="w-3 h-3 text-amber-400" />
                PRO (0s Instant Snipes)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 text-[10px] font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                FREE (10s Delay)
              </span>
            )}

            <button
              onClick={() => onToggleMembership(isPro ? 'free' : 'pro')}
              className="text-[10px] underline text-slate-400 hover:text-white transition-colors"
              title="Toggle Free vs Pro membership to test delay"
            >
              {isPro ? 'Switch to Free (10s Delay)' : 'Upgrade to Pro (0s Instant)'}
            </button>
          </div>
        </div>

        {/* Center / Right: Live Purse & Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Purse Balance */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/90 rounded-md border border-amber-500/20 text-xs">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400 font-medium">Purse:</span>
            <span className="font-mono font-bold text-amber-300 tabular-nums">
              {formatCoins(modState.purse)}
            </span>
            <span className="text-amber-500/80 text-[10px]">coins</span>
          </div>

          {modState.purse > 0 && (
            <button
              onClick={onSetBudgetToPurse}
              title="Filter snipe feed to only items you can afford"
              className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1 whitespace-nowrap"
            >
              <RefreshCw className="w-3 h-3 text-slate-400" />
              Set Budget
            </button>
          )}

          {/* Hypixel Scan trigger */}
          <button
            onClick={onTriggerScan}
            disabled={scannerState.isScanning}
            title="Force immediate rescan of all Hypixel Skyblock auctions"
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap"
          >
            <RefreshCw className={`w-3 h-3 ${scannerState.isScanning ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
            {scannerState.isScanning ? 'Scanning...' : 'Scan Hypixel AH'}
          </button>

          <button
            onClick={onOpenSimulator}
            className="text-xs px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1 whitespace-nowrap"
          >
            <Terminal className="w-3 h-3 text-cyan-400" />
            Seikeyo Simulator
          </button>
        </div>
      </div>
    </div>
  );
};
