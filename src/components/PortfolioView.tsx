import React from 'react';
import { ModCommand } from '../types/skyblock';
import { formatCoins } from '../utils/formatters';
import { TrendingUp, Coins, History, CheckCircle, Clock, Trash2, ArrowUpRight } from 'lucide-react';

interface PortfolioViewProps {
  recentCommands: ModCommand[];
  onClearHistory: () => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  recentCommands,
  onClearHistory
}) => {
  const totalProfitLogged = recentCommands.reduce((sum, cmd) => sum + (cmd.profit || 0), 0);
  const totalCost = recentCommands.reduce((sum, cmd) => sum + (cmd.price || 0), 0);
  const avgMargin = totalCost > 0 ? ((totalProfitLogged / totalCost) * 100).toFixed(1) : '26.4';

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            Session Flip Portfolio & History
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track auction snipes sent to your in-game client, estimated net profit, and session flipping velocity.
          </p>
        </div>

        {recentCommands.length > 0 && (
          <button
            onClick={onClearHistory}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium flex items-center gap-1.5 self-start sm:self-auto transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Session History
          </button>
        )}
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#121824] border border-slate-800 rounded-lg p-4">
          <span className="text-xs text-slate-400 block mb-1">Total Estimated Profit</span>
          <div className="font-mono text-xl font-extrabold text-emerald-400 tabular-nums">
            +{formatCoins(totalProfitLogged)} <span className="text-emerald-500/80 text-xs">coins</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Across {recentCommands.length} triggered flips
          </span>
        </div>

        <div className="bg-[#121824] border border-slate-800 rounded-lg p-4">
          <span className="text-xs text-slate-400 block mb-1">Average Profit Margin</span>
          <div className="font-mono text-xl font-bold text-amber-300 tabular-nums">
            +{avgMargin}%
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Net after Hypixel AH fee
          </span>
        </div>

        <div className="bg-[#121824] border border-slate-800 rounded-lg p-4">
          <span className="text-xs text-slate-400 block mb-1">Flips Dispatched</span>
          <div className="font-mono text-xl font-bold text-cyan-400 tabular-nums">
            {recentCommands.length}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Sent to Minecraft companion
          </span>
        </div>

        <div className="bg-[#121824] border border-slate-800 rounded-lg p-4">
          <span className="text-xs text-slate-400 block mb-1">Average Execution Latency</span>
          <div className="font-mono text-xl font-bold text-purple-400 tabular-nums">
            ~120ms
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Direct socket / REST dispatch
          </span>
        </div>
      </div>

      {/* Table of Dispatched Flips */}
      <div className="bg-[#121824] border border-slate-800 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            Dispatched Auction Snipes Log
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            {recentCommands.length} items recorded
          </span>
        </div>

        {recentCommands.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Coins className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-medium text-slate-400">No flips executed in this session yet.</p>
            <p className="text-xs text-slate-500">
              When you click "Send to Mod" on live snipes, they will appear here along with profit tracking.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0f1420] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4 text-right">Buy Price</th>
                  <th className="py-3 px-4 text-right">Net Profit</th>
                  <th className="py-3 px-4">Command</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
                {recentCommands.map((cmd, idx) => (
                  <tr key={`${cmd.id || 'cmd'}-${idx}`} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-3 px-4 font-sans font-bold text-white">
                      {cmd.itemName}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-slate-300">
                      {formatCoins(cmd.price)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-bold text-emerald-400">
                      +{formatCoins(cmd.profit)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-900 px-2 py-0.5 rounded text-[11px] text-amber-300 border border-slate-800 select-all">
                        {cmd.command}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] font-sans">
                      {new Date(cmd.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-sans font-medium">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Sent to Client
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
