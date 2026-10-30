import React from 'react';
import { ModConnectionState, PlayerProfile } from '../types/skyblock';
import { User, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  activeTab: 'flips' | 'companion' | 'portfolio' | 'matrix' | 'modcode';
  setActiveTab: (tab: 'flips' | 'companion' | 'portfolio' | 'matrix' | 'modcode') => void;
  modState: ModConnectionState;
  playerProfile: PlayerProfile | null;
  onOpenPlayerModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  modState,
  playerProfile,
  onOpenPlayerModal
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800 bg-[#0d121d]/95 backdrop-blur-md sticky top-0 z-30">
      {/* Zone 1: Single text element wordmark with brand emblem */}
      <div 
        onClick={() => setActiveTab('flips')}
        className="flex items-center gap-2.5 cursor-pointer select-none shrink-0"
      >
        <img 
          src="/src/assets/images/skyblock_coin_insignia_1793316416856.jpg" 
          alt="SkyFlip"
          className="w-8 h-8 rounded-full border border-amber-500/40 object-cover shadow-sm"
          referrerPolicy="no-referrer"
        />
        <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
          SkyFlip <span className="text-amber-400 font-normal text-sm ml-1">AH</span>
        </span>
      </div>

      {/* Zone 2: 4-5 clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
        <button
          onClick={() => setActiveTab('flips')}
          className={`transition-colors whitespace-nowrap shrink-0 hover:text-white ${
            activeTab === 'flips' ? 'text-amber-400 font-semibold' : 'text-slate-400'
          }`}
        >
          Live Flips
        </button>
        <button
          onClick={() => setActiveTab('companion')}
          className={`transition-colors whitespace-nowrap shrink-0 hover:text-white ${
            activeTab === 'companion' ? 'text-amber-400 font-semibold' : 'text-slate-400'
          }`}
        >
          Mod Companion
        </button>
        <button
          onClick={() => setActiveTab('portfolio')}
          className={`transition-colors whitespace-nowrap shrink-0 hover:text-white ${
            activeTab === 'portfolio' ? 'text-amber-400 font-semibold' : 'text-slate-400'
          }`}
        >
          Portfolio & History
        </button>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`transition-colors whitespace-nowrap shrink-0 hover:text-white ${
            activeTab === 'matrix' ? 'text-amber-400 font-semibold' : 'text-slate-400'
          }`}
        >
          Target Matrix
        </button>
        <button
          onClick={() => setActiveTab('modcode')}
          className={`transition-colors whitespace-nowrap shrink-0 hover:text-white ${
            activeTab === 'modcode' ? 'text-amber-400 font-semibold' : 'text-slate-400'
          }`}
        >
          Fabric 26.2 Mod
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenPlayerModal}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 whitespace-nowrap shrink-0 flex items-center gap-2 ${
            playerProfile
              ? 'bg-slate-900 text-white border border-amber-500/40 hover:bg-slate-800'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/10'
          }`}
        >
          {playerProfile ? (
            <>
              <img
                src={playerProfile.avatarUrl}
                alt={playerProfile.username}
                className="w-4 h-4 rounded-sm bg-slate-800"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="font-mono">{playerProfile.username}</span>
            </>
          ) : (
            <>
              <User className="w-3.5 h-3.5" />
              Connect Minecraft IGN
            </>
          )}
        </button>
      </div>
    </header>
  );
};
