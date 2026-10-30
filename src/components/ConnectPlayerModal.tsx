import React, { useState } from 'react';
import { PlayerProfile } from '../types/skyblock';
import { X, Check, User, ShieldCheck, LogOut, ExternalLink, Loader2, Tag } from 'lucide-react';

interface ConnectPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerProfile: PlayerProfile | null;
  onConnectPlayer: (username: string) => Promise<boolean>;
  onDisconnectPlayer: () => Promise<void>;
}

export const ConnectPlayerModal: React.FC<ConnectPlayerModalProps> = ({
  isOpen,
  onClose,
  playerProfile,
  onConnectPlayer,
  onDisconnectPlayer
}) => {
  const [username, setUsername] = useState(playerProfile?.username || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMsg('Please enter your Minecraft username');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const success = await onConnectPlayer(username.trim());
    setLoading(false);

    if (success) {
      setSuccessMsg(`Successfully connected as ${username}!`);
      setTimeout(() => {
        onClose();
      }, 1400);
    } else {
      setErrorMsg('Failed to resolve Minecraft account. Please check spelling.');
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    await onDisconnectPlayer();
    setLoading(false);
    setUsername('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div 
        className="relative w-full max-w-lg bg-[#0d121c] border border-slate-700/80 rounded-xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#111723]">
          <div className="flex items-center gap-2.5">
            <User className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Connect Minecraft Account & Hypixel
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {playerProfile ? (
            /* Connected State */
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-[#141b2b] border border-slate-800">
                <img
                  src={playerProfile.avatarUrl}
                  alt={playerProfile.username}
                  className="w-14 h-14 rounded-lg border-2 border-amber-500/50 shadow-md bg-slate-900"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white truncate font-mono">
                      {playerProfile.username}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                      VERIFIED
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 font-mono truncate">
                    UUID: {playerProfile.uuid}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    <span>{playerProfile.activeAuctionsCount} active auctions on Hypixel AH</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-900/80 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-1.5 leading-relaxed">
                <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Synced with SkyFlip Companion
                </div>
                <p className="text-slate-400">
                  Your Fabric 26.2 mod will automatically recognize <strong>{playerProfile.username}</strong> and prioritize auctions matching your profile.
                </p>
              </div>

              <button
                onClick={handleDisconnect}
                disabled={loading}
                className="w-full py-2 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-600/50 text-rose-300 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                Disconnect Account
              </button>
            </div>
          ) : (
            /* Input Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Link your in-game Minecraft character to sync your scoreboard purse, track your active Hypixel auctions, and enable instant Fabric mod commands.
              </p>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Minecraft Java Username (IGN) *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. derptastic41"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Resolves your official Mojang UUID and player skin avatar.
                </span>
              </div>

              <div className="text-xs text-emerald-300 bg-emerald-950/30 border border-emerald-800/40 rounded-lg p-3">
                No Hypixel developer API key needed. SkyFlip scans public auctions centrally and shares the results with all connected users.
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-rose-950/40 border border-rose-500/50 rounded-lg text-xs text-rose-300">
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/50 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {successMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-md shadow-amber-500/10"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting to Mojang & Hypixel...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Connect Minecraft Profile
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
