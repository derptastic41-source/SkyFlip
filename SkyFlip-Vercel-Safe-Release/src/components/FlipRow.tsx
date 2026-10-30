import React, { useState } from 'react';
import { AuctionFlip } from '../types/skyblock';
import { formatCoins, formatTimeRemaining, getRarityColor, getRarityBorderColor } from '../utils/formatters';
import { Send, Copy, Check, Eye, AlertTriangle, ShieldCheck, Flame, Clock, CheckCircle2 } from 'lucide-react';

interface FlipRowProps {
  flip: AuctionFlip;
  modConnected: boolean;
  onSendCommand: (flip: AuctionFlip) => void;
  onInspect: (flip: AuctionFlip) => void;
  playerPurse: number;
}

export const FlipRow: React.FC<FlipRowProps> = ({
  flip,
  modConnected,
  onSendCommand,
  onInspect,
  playerPurse
}) => {
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  const rarityColor = getRarityColor(flip.rarity);
  const borderColor = getRarityBorderColor(flip.rarity);

  const handleCopyCommand = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`/viewauction ${flip.uuid}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToMod = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSendCommand(flip);
    setSent(true);
    setTimeout(() => setSent(false), 2500);
  };

  return (
    <div 
      onClick={() => onInspect(flip)}
      className={`group relative bg-[#131926] hover:bg-[#182133] border ${borderColor} rounded-lg p-3.5 transition-all duration-150 cursor-pointer shadow-sm hover:shadow-md`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Item identity, stars, recomb, category */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Item visual badge / category icon */}
          <div className="w-10 h-10 rounded-md bg-slate-900 border border-slate-700/80 flex items-center justify-center shrink-0 text-base font-bold select-none relative">
            <span style={{ color: rarityColor }}>
              {flip.category === 'WEAPONS' ? '⚔' : 
               flip.category === 'ARMOR' ? '🛡' : 
               flip.category === 'PETS' ? '🐾' : 
               flip.category === 'MINING' ? '⛏' : 
               flip.category === 'ACCESSORIES' ? '💍' : '📦'}
            </span>
            {flip.isRecombobulated && (
              <span className="absolute -top-1 -right-1 text-[10px] text-pink-400 font-bold" title="Recombobulated">
                ◆
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span 
                className="font-bold text-sm truncate tracking-tight"
                style={{ color: rarityColor }}
              >
                {flip.itemName}
              </span>
              {flip.isRecombobulated && (
                <span className="text-[10px] font-mono text-pink-400 font-semibold">
                  (◆ Recomb)
                </span>
              )}

              {/* Hypixel Live Tag */}
              <span className="px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-500/30 text-[10px] font-mono flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5 text-amber-400" />
                Live on Hypixel
              </span>
            </div>

            {/* Quiet metadata line */}
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
              <span className="uppercase text-[11px] font-semibold text-slate-300">
                {flip.rarity}
              </span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="text-slate-400">{flip.category}</span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="flex items-center gap-1 text-slate-400">
                <Clock className="w-3 h-3 text-slate-500" />
                {formatTimeRemaining(flip.endsAt)}
              </span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="text-slate-500 text-[11px] font-mono truncate max-w-[120px]" title={`Seller: ${flip.seller}`}>
                Seller: {flip.seller ? flip.seller.slice(0, 8) : 'Hypixel'}
              </span>

              {flip.demand === 'HIGH' && (
                <>
                  <span className="text-slate-600" aria-hidden="true">·</span>
                  <span className="text-amber-400 font-medium flex items-center gap-0.5 text-[11px]">
                    <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                    High Volume
                  </span>
                </>
              )}

              {flip.isSuspectedManipulation && (
                <>
                  <span className="text-slate-600" aria-hidden="true">·</span>
                  <span className="text-rose-400 font-semibold flex items-center gap-1 text-[11px]">
                    <AlertTriangle className="w-3 h-3 text-rose-500" />
                    Risk: Possible Manip
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center: Buy Price & Target / Estimated Value */}
        <div className="flex items-center gap-6 shrink-0 text-right pr-2">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Buy Price (BIN)</div>
            <div className="font-mono text-sm font-bold text-white tabular-nums">
              {formatCoins(flip.buyPrice)} <span className="text-slate-500 text-xs font-normal">coins</span>
            </div>
          </div>

          <div>
            <div className="text-[11px] text-slate-400 font-medium">Fair Value / 2nd LBIN</div>
            <div className="font-mono text-sm text-slate-300 tabular-nums">
              {formatCoins(flip.estimatedValue)}
            </div>
          </div>

          <div className="min-w-[110px]">
            <div className="text-[11px] text-emerald-400/90 font-medium">Net Profit (after tax)</div>
            <div className="font-mono text-base font-extrabold text-emerald-400 tabular-nums">
              +{formatCoins(flip.netProfit)}
            </div>
            <div className="text-[10px] text-emerald-500/80 font-mono font-semibold">
              +{flip.profitMargin}% margin
            </div>
          </div>
        </div>

        {/* Right: Functional Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
          {/* Send to Minecraft Mod button */}
          <button
            onClick={handleSendToMod}
            title={modConnected ? "Send real /viewauction command directly to in-game Fabric mod" : "Queues real /viewauction for Fabric 26.2 mod"}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap shadow-sm ${
              sent
                ? 'bg-emerald-600 text-white'
                : modConnected
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 hover:shadow-amber-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            {sent ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Sent to Fabric!
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Send to Mod
              </>
            )}
          </button>

          {/* Copy Command */}
          <button
            onClick={handleCopyCommand}
            title={`Copy /viewauction ${flip.uuid} to clipboard`}
            className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Inspect Lore */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInspect(flip);
            }}
            title="Inspect Item Lore and Hypixel Stats"
            className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <Eye className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
