import React, { useState } from 'react';
import { AuctionFlip } from '../types/skyblock';
import { formatCoins, parseMinecraftLore, getRarityColor, formatTimeRemaining } from '../utils/formatters';
import { X, Copy, Check, Send, AlertTriangle, ShieldCheck, ExternalLink, Calculator, CheckCircle2 } from 'lucide-react';

interface ItemInspectModalProps {
  flip: AuctionFlip | null;
  onClose: () => void;
  onSendCommand: (flip: AuctionFlip) => void;
  modConnected: boolean;
}

export const ItemInspectModal: React.FC<ItemInspectModalProps> = ({
  flip,
  onClose,
  onSendCommand,
  modConnected
}) => {
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  if (!flip) return null;

  const rarityColor = getRarityColor(flip.rarity);

  const handleCopy = () => {
    navigator.clipboard.writeText(`/viewauction ${flip.uuid}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    onSendCommand(flip);
    setSent(true);
    setTimeout(() => setSent(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div 
        className="relative w-full max-w-2xl bg-[#0c1018] border border-slate-700/80 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#111723]">
          <div className="flex items-center gap-2 flex-wrap">
            <span 
              className="text-lg font-bold tracking-tight"
              style={{ color: rarityColor }}
            >
              {flip.itemName}
            </span>
            {flip.isRecombobulated && (
              <span className="text-xs text-pink-400 font-mono font-bold">
                (◆ Recombobulated)
              </span>
            )}
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Hypixel Live Auction
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top row: Price & Profit Calculation Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-lg bg-[#141b2b] border border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Buy Price (BIN)</span>
              <span className="font-mono text-base font-bold text-white tabular-nums">
                {formatCoins(flip.buyPrice)}
              </span>
              <span className="text-[10px] text-slate-500 block">coins</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Estimated Value / 2nd LBIN</span>
              <span className="font-mono text-base font-bold text-slate-200 tabular-nums">
                {formatCoins(flip.estimatedValue)}
              </span>
              <span className="text-[10px] text-slate-500 block">
                Hypixel AH Tax: -{formatCoins(flip.taxAmount)}
              </span>
            </div>

            <div>
              <span className="text-emerald-400 block mb-1 font-semibold">Net Profit (Post-Tax)</span>
              <span className="font-mono text-base font-extrabold text-emerald-400 tabular-nums">
                +{formatCoins(flip.netProfit)}
              </span>
              <span className="text-[10px] text-emerald-500 font-mono block">
                +{flip.profitMargin}% margin
              </span>
            </div>
          </div>

          {/* Authentic Minecraft Item Tooltip Box */}
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Authentic Hypixel Skyblock Item Lore</span>
              <span className="text-amber-400 font-mono text-[11px]">Real Auction UUID: {flip.uuid}</span>
            </div>

            <div className="bg-[#100010] border-2 border-[#2b005e] rounded-md p-4 font-mono text-xs leading-relaxed space-y-1 shadow-inner select-text">
              {/* Item Title in Lore */}
              <div className="text-sm font-bold pb-1" style={{ color: rarityColor }}>
                {flip.itemName}
              </div>

              {/* Rendered lore lines with Minecraft color parsing */}
              {flip.lore.map((line, idx) => {
                const parsed = parseMinecraftLore(line);
                if (line.trim() === '') {
                  return <div key={idx} className="h-2" />;
                }
                return (
                  <div key={idx} className="min-h-[1.1rem]">
                    {parsed.map((part, pIdx) => (
                      <span
                        key={pIdx}
                        style={{ color: part.color }}
                        className={part.bold ? 'font-bold' : ''}
                      >
                        {part.text}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Auction Details & Manipulation notice if any */}
          {flip.isSuspectedManipulation && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/50 rounded-lg text-xs text-rose-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-rose-200">Price Manipulation Warning:</span>{' '}
                {flip.manipulationWarningReason || 'This item has volatile sales history. Proceed with caution.'}
              </div>
            </div>
          )}

          {/* In-Game Command Execution Card with Real UUID */}
          <div className="p-4 bg-[#141b2b] border border-slate-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Live In-Game Command (Works in Minecraft Hypixel)
              </span>
              <span className="text-slate-500 font-mono text-[11px]">
                Seller: <strong className="text-slate-300">{flip.seller || 'Hypixel User'}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 font-mono text-xs text-amber-300 truncate select-all">
                /viewauction {flip.uuid}
              </div>
              <button
                onClick={handleCopy}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-[#111723] text-xs">
          <div className="text-slate-400">
            Expires in <span className="text-slate-200 font-medium">{formatTimeRemaining(flip.endsAt)}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleSend}
              className={`px-4 py-1.5 rounded-lg font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                sent
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/10'
              }`}
            >
              {sent ? (
                <>
                  <Check className="w-4 h-4" />
                  Sent to In-Game Mod!
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send /viewauction to Mod
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
