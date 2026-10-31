import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  AuctionFlip, 
  ModConnectionState, 
  ModCommand, 
  FilterSettings, 
  PlayerProfile, 
  ScannerState 
} from './types/skyblock';
import { Header } from './components/Header';
import { supabase } from './lib/supabase';
import { AccountAuth, AccountSettings } from './components/AccountAuth';
import type { User } from '@supabase/supabase-js';
import { ModStatusBanner } from './components/ModStatusBanner';
import { FilterBar } from './components/FilterBar';
import { FlipRow } from './components/FlipRow';
import { ItemInspectModal } from './components/ItemInspectModal';
import { ConnectPlayerModal } from './components/ConnectPlayerModal';
import { ModCompanionView } from './components/ModCompanionView';
import { PortfolioView } from './components/PortfolioView';
import { TargetMatrixView } from './components/TargetMatrixView';
import { soundManager } from './utils/audio';
import { formatCoins } from './utils/formatters';
import { Flame, Sparkles, Filter, RefreshCw, Zap, Bell, CheckCircle2, Loader2, Radio } from 'lucide-react';

export default function App() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return; }
    let alive = true;
    supabase.auth.getUser().then(({ data }) => { if (alive) { setAuthUser(data.user); setAuthLoading(false); } }).catch(() => { if (alive) setAuthLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;
      setAuthUser(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') { setPasswordRecovery(true); setShowAccountSettings(true); }
      if (event === 'SIGNED_OUT') { setShowAccountSettings(false); setPasswordRecovery(false); }
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  const [activeTab, setActiveTab] = useState<'flips' | 'companion' | 'portfolio' | 'matrix' | 'modcode'>('flips');
  const [flips, setFlips] = useState<AuctionFlip[]>([]);
  const [timings, setTimings] = useState({ scanSeconds: 60, alertSeconds: 30, maxAlerts: 1, pageLimit: 20 });
  const [timingSaved, setTimingSaved] = useState('');
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);

  const [scannerState, setScannerState] = useState<ScannerState>({
    isScanning: false,
    lastScanTime: 0,
    totalAuctionsScanned: 0,
    totalPagesScanned: 0,
    totalBinAuctions: 0,
    activeSnipesCount: 0,
    scanProgress: 0,
  });

  const [modState, setModState] = useState<ModConnectionState>({
    token: 'LOADING...',
    isConnected: false,
    ign: 'Not Connected',
    purse: 0,
    bank: 0,
    location: 'Offline',
    lastPing: 0,
    lastSyncTime: 0,
    modVersion: '26.2.0-FABRIC',
    clientType: 'FABRIC_26_2',
    modName: 'SeikeyoFlipper',
    membershipTier: 'free',
    autoBuyArmed: false,
    tokenRevoked: false,
  });

  const [recentCommands, setRecentCommands] = useState<ModCommand[]>([]);
  const [inspectingFlip, setInspectingFlip] = useState<AuctionFlip | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastNotification, setLastNotification] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterSettings>({
    minProfit: 0,
    minMarginPercent: 0,
    maxBudget: 0,
    usePurseAsBudget: false,
    selectedCategories: [],
    selectedRarities: [],
    hideManipulations: true,
    minDemand: 'ALL',
    soundAlerts: true,
    soundVolume: 0.5,
    autoSendToMod: false,
  });

  // Reference to avoid stale closure in SSE
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Initial Fetch of flips, mod status, player profile, scanner status
  useEffect(() => {
    fetchFlips();
    // Billing is intentionally disabled until per-user authentication and verified Live subscriptions are implemented.
    accountHeaders().then(headers => fetch('/api/settings/alerts', { headers })).then(r => r.json()).then(setTimings).catch(() => {});
    fetchModStatus();
    fetchPlayerProfile();
    fetchScannerStatus();
    fetchToken();

    // Live mod streaming is not deployed; avoid opening a reconnecting 503 endpoint.
    /*

    eventSource.addEventListener('flips_updated', () => {
      fetchFlips();
    });

    eventSource.addEventListener('scanner_update', (e) => {
      try {
        const update: ScannerState = JSON.parse(e.data);
        setScannerState(update);
      } catch (err) {}
    });

    eventSource.addEventListener('player_connected', (e) => {
      try {
        const profile: PlayerProfile = JSON.parse(e.data);
        setPlayerProfile(profile);
      } catch (err) {}
    });

    eventSource.addEventListener('mod_status', (e) => {
      try {
        const updatedModState: ModConnectionState = JSON.parse(e.data);
        setModState(updatedModState);
      } catch (err) {}
    });

    eventSource.addEventListener('mod_command', (e) => {
      try {
        const cmd: ModCommand = JSON.parse(e.data);
        setRecentCommands(prev => {
          if (prev.some(c => c.id === cmd.id)) return prev;
          return [cmd, ...prev];
        });
        setLastNotification(`Sent /viewauction to Fabric 26.2 mod for ${cmd.itemName}!`);
        setTimeout(() => setLastNotification(null), 4000);
      } catch (err) {}
    });

    */
    // Poll public auction data while the page is open.
    const interval = setInterval(() => {
      fetchFlips();
      fetchScannerStatus();
    }, 60000);

    return () => {

      clearInterval(interval);
    };
  }, []);

  const fetchFlips = async () => {
    try {
      const res = await fetch('/api/flips');
      const data = await res.json();
      if (data.flips) {
        setFlips(data.flips);
      }
    } catch (err) {}
  };

  const fetchModStatus = async () => {
    try {
      const res = await fetch('/api/mod/status');
      const data = await res.json();
      setModState(data);
    } catch {}
  };

  const accountHeaders = async (): Promise<HeadersInit> => {
    const session = await supabase?.auth.getSession();
    const token = session?.data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    if (authUser) { fetchPlayerProfile(); accountHeaders().then(headers => fetch('/api/settings/alerts', { headers })).then(r => r.json()).then(setTimings).catch(() => {}); }
  }, [authUser]);

  const fetchPlayerProfile = async () => {
    try {
      const res = await fetch('/api/player/profile', { headers: await accountHeaders() });
      const data = await res.json();
      if (data.profile) {
        setPlayerProfile(data.profile);
      }
    } catch {}
  };

  const fetchScannerStatus = async () => {
    try {
      const res = await fetch('/api/hypixel/scanner-status');
      const data = await res.json();
      setScannerState(data);
    } catch {}
  };

  const fetchToken = async () => {
    try {
      const res = await fetch('/api/mod/token');
      const data = await res.json();
      if (data.token) {
        setModState(prev => ({ ...prev, token: data.token }));
      }
    } catch {}
  };

  const handleConnectPlayer = async (username: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/player/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...await accountHeaders() },
        body: JSON.stringify({ username })
      });
      const data = await res.json();
      if (data.success && data.profile) {
        setPlayerProfile(data.profile);
        setModState(prev => ({
          ...prev,
          ign: data.profile.username,
          playerUuid: data.profile.uuid,
          avatarUrl: data.profile.avatarUrl
        }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleDisconnectPlayer = async () => {
    try {
      await fetch('/api/player/disconnect', { method: 'POST', headers: await accountHeaders() });
      setPlayerProfile(null);
      setModState(prev => ({
        ...prev,
        ign: 'Not Connected',
        playerUuid: undefined,
        avatarUrl: undefined
      }));
    } catch {}
  };

  const handleTriggerScan = async () => {
    try {
      await fetch('/api/hypixel/scan', { method: 'POST' });
      setScannerState(prev => ({ ...prev, isScanning: true, scanProgress: 10 }));
      setLastNotification('Refreshing available Hypixel auction data (limited-page scan)...');
      setTimeout(() => setLastNotification(null), 3000);
    } catch {}
  };

  const handleResetToken = async () => {
    try {
      const res = await fetch('/api/player/token/generate', { method: 'POST' });
      const data = await res.json();
      if (data.token) {
        setModState(prev => ({ ...prev, token: data.token, tokenRevoked: false, isConnected: false }));
        setLastNotification('Generated fresh SeikeyoFlipper mod token.');
        setTimeout(() => setLastNotification(null), 3000);
      }
    } catch {}
  };

  const handleRevokeToken = async () => {
    try {
      const res = await fetch('/api/player/token/revoke', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setModState(prev => ({ ...prev, tokenRevoked: true, isConnected: false }));
        setLastNotification('SeikeyoFlipper token has been revoked.');
        setTimeout(() => setLastNotification(null), 3500);
      }
    } catch {}
  };

  const handleToggleMembership = async (tier: 'free' | 'pro') => {
    if (tier !== 'pro') { setLastNotification('Premium cancellation must be handled through billing support.'); return; }
    try {
      const res = await fetch('/api/billing/checkout', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Checkout unavailable');
      window.location.assign(data.url);
    } catch (err) { setLastNotification(String(err)); }
  };

  const handleSendCommand = async (flip: AuctionFlip) => {
    try {
      const res = await fetch('/api/mod/send-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemUuid: flip.uuid,
          itemName: flip.itemName,
          price: flip.buyPrice,
          profit: flip.netProfit,
          action: 'VIEW_AUCTION'
        })
      });
      const data = await res.json();
      if (data.command) {
        setRecentCommands(prev => {
          if (prev.some(c => c.id === data.command.id)) return prev;
          return [data.command, ...prev];
        });
        setLastNotification(`Sent /viewauction ${flip.uuid.slice(0, 8)}... to ${modState.ign}!`);
        setTimeout(() => setLastNotification(null), 3500);
      }
    } catch {}
  };

  const handleToggleAutoBuy = async () => {
    const nextVal = !modState.autoBuyArmed;
    try {
      const res = await fetch('/api/mod/toggle-autobuy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ armed: nextVal })
      });
      const data = await res.json();
      setModState(prev => ({ ...prev, autoBuyArmed: data.autoBuyArmed }));
    } catch {}
  };

  const handleSimulateClient = async (data: {
    ign: string;
    purse: number;
    bank: number;
    location: string;
    isConnected: boolean;
  }) => {
    try {
      const res = await fetch('/api/mod/simulate-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const resData = await res.json();
      if (resData.modState) {
        setModState(resData.modState);
      }
    } catch {}
  };

  const handleSetBudgetToPurse = () => {
    if (modState.purse > 0) {
      setFilters(prev => ({ ...prev, maxBudget: modState.purse }));
    }
  };

  const handleClearHistory = () => {
    setRecentCommands([]);
  };

  // Filtered flips calculation
  const filteredFlips = useMemo(() => {
    return flips.filter(flip => {
      // Search
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchName = flip.itemName.toLowerCase().includes(q);
        const matchCategory = flip.category.toLowerCase().includes(q);
        const matchSeller = (flip.seller || '').toLowerCase().includes(q);
        if (!matchName && !matchCategory && !matchSeller) return false;
      }

      // Profit threshold
      if (filters.minProfit > 0 && flip.netProfit < filters.minProfit) {
        return false;
      }

      // Margin percent
      if (filters.minMarginPercent > 0 && flip.profitMargin < filters.minMarginPercent) {
        return false;
      }

      // Max Budget
      if (filters.maxBudget > 0 && flip.buyPrice > filters.maxBudget) {
        return false;
      }

      // Category
      if (filters.selectedCategories.length > 0 && !filters.selectedCategories.includes(flip.category)) {
        return false;
      }

      // Manipulation Safe Mode
      if (filters.hideManipulations && flip.isSuspectedManipulation) {
        return false;
      }

      return true;
    });
  }, [flips, filters, searchQuery]);

  const isPremium = modState.membershipTier === 'pro';
  const visibleFlips = filteredFlips.slice(0, isPremium ? timings.pageLimit : 20);

  if (!supabase) return <main className="min-h-screen bg-[#0b0f17] p-8 text-slate-200"><h1 className="text-2xl font-bold text-amber-400">SkyFlip setup required</h1><p className="mt-3 max-w-xl">Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Vercel project, then redeploy. Only use the public Supabase publishable/anon key.</p></main>;
  if (authLoading) return <main className="min-h-screen bg-[#0b0f17] flex items-center justify-center text-amber-400">Loading SkyFlip account…</main>;
  if (!authUser) return <AccountAuth onAuthenticated={() => {}} />;
  if (showAccountSettings) return <div className="min-h-screen bg-[#0b0f17] flex flex-col"><AccountSettings user={authUser} onClose={() => {setShowAccountSettings(false);setPasswordRecovery(false);}} />{passwordRecovery && <p className="text-center pb-4 text-amber-300">Set a new password above to finish account recovery.</p>}</div>;

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-200 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        modState={modState}
        playerProfile={playerProfile}
        onOpenPlayerModal={() => setIsPlayerModalOpen(true)}
      />

      <div className="flex items-center justify-end gap-3 border-b border-slate-800 bg-[#0d121d] px-6 py-2 text-xs text-slate-400"><span className="max-w-56 truncate">{authUser.email}</span><button onClick={() => setShowAccountSettings(true)} className="rounded border border-amber-500/40 px-3 py-1.5 font-semibold text-amber-400 hover:bg-slate-800">Account settings</button><button onClick={() => supabase?.auth.signOut()} className="rounded border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-800">Log out</button></div>

      {/* Real-time Mod Status & Hypixel Scanner Banner */}
      <ModStatusBanner
        modState={modState}
        playerProfile={playerProfile}
        scannerState={scannerState}
        onSetBudgetToPurse={handleSetBudgetToPurse}
        onToggleAutoBuy={handleToggleAutoBuy}
        onOpenSimulator={() => setActiveTab('companion')}
        onOpenPlayerModal={() => setIsPlayerModalOpen(true)}
        onTriggerScan={handleTriggerScan}
        onToggleMembership={handleToggleMembership}
      />

      {/* Floating In-Game Toast notification */}
      {lastNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#162032] border border-amber-500/60 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{lastNotification}</span>
        </div>
      )}

      {import.meta.env.PROD && <div role="status" className="border-b border-amber-500/40 bg-amber-950 px-5 py-3 text-sm text-amber-200">SkyFlip beta — live auction listings are sampled, not a full-market scanner. Minecraft mod pairing, automatic alerts and Premium checkout are not yet available.</div>}

      {/* Main Viewport */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'flips' && (
          <div className="flex-1 flex flex-col">
            {/* Filter controls strip */}
            <FilterBar
              filters={filters}
              setFilters={setFilters}
              onTestSound={() => soundManager.playDing(filters.soundVolume)}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              playerPurse={modState.purse}
            />

            {/* Content view */}
            <div className="max-w-7xl mx-auto w-full p-6 space-y-4">
              <div className="rounded-lg border border-amber-600/40 bg-slate-900 p-3 text-xs">
                {isPremium ? 'Premium active — instant listing access and custom settings.' : 'Free plan — auction listings and mod alerts are delayed 20 seconds; 20 listings per page.'}
              </div>
              {/* Separate scanner frequency from Minecraft chat notification frequency. */}
              <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-xs">
                <fieldset disabled={!isPremium} className="contents"><label className="flex flex-col gap-1">Scanner interval (seconds, min 60)
                  <input className="rounded bg-slate-800 p-2 w-28" type="number" min="60" max="600" value={timings.scanSeconds} onChange={e => setTimings(t => ({...t, scanSeconds: Number(e.target.value)}))} />
                </label>
                <label className="flex flex-col gap-1">Chat alert cooldown (seconds)
                  <input className="rounded bg-slate-800 p-2 w-28" type="number" min="5" max="600" value={timings.alertSeconds} onChange={e => setTimings(t => ({...t, alertSeconds: Number(e.target.value)}))} />
                </label>
                <label className="flex flex-col gap-1">Alerts per interval
                  <input className="rounded bg-slate-800 p-2 w-24" type="number" min="1" max="5" value={timings.maxAlerts} onChange={e => setTimings(t => ({...t, maxAlerts: Number(e.target.value)}))} />
                </label>
                <label className="flex flex-col gap-1">Auctions on page (up to 100,000)
                  <input className="rounded bg-slate-800 p-2 w-32" type="number" min="1" max="100000" value={timings.pageLimit} onChange={e => setTimings(t => ({...t, pageLimit: Number(e.target.value)}))} />
                </label>
                <button disabled={!isPremium} className="rounded bg-amber-500 px-4 py-2 font-semibold text-black disabled:opacity-50" onClick={async () => {
                  try {
                    const res = await fetch('/api/settings/alerts', {method:'POST', headers:{'Content-Type':'application/json', ...await accountHeaders()}, body: JSON.stringify(timings)});
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Save failed');
                    setTimings(data); setTimingSaved('Saved');
                  } catch(e) { setTimingSaved(String(e)); }
                }}>Save timers</button>
                <span>{timingSaved}</span></fieldset>
              </div>
              {/* Feed Header, Count & Hypixel Scanning Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white text-sm">Real Hypixel AH Snipes</span>
                  <span className="text-slate-600" aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-amber-300 font-semibold">
                    {filteredFlips.length} live opportunities
                  </span>
                  <span className="text-slate-600" aria-hidden="true">·</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                    Real Hypixel UUIDs (/viewauction verified)
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleTriggerScan}
                    disabled={scannerState.isScanning}
                    className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${scannerState.isScanning ? 'animate-spin' : ''}`} />
                    {scannerState.isScanning ? 'Scanning Hypixel Pages...' : 'Scan Hypixel Auctions Now'}
                  </button>
                </div>
              </div>

              {/* Feed List */}
              {filteredFlips.length === 0 ? (
                <div className="bg-[#121824] border border-slate-800 rounded-lg p-12 text-center space-y-3">
                  {scannerState.isScanning ? (
                    <div className="space-y-3">
                      <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
                      <p className="text-sm font-semibold text-white">
                        Scanning Hypixel Skyblock auction pages... ({scannerState.scanProgress}%)
                      </p>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        Fetching live Buy-It-Now items from Hypixel and calculating profit margins. Results will appear in a few moments!
                      </p>
                    </div>
                  ) : (
                    <>
                      <Filter className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-sm font-semibold text-slate-300">
                        No active snipes match your current filters.
                      </p>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        Try loosening your minimum profit or margin filters, or click "Scan Hypixel Auctions Now" to refresh all pages!
                      </p>
                      <button
                        onClick={() => {
                          setFilters(prev => ({
                            ...prev,
                            minProfit: 0,
                            minMarginPercent: 0,
                            maxBudget: 0,
                            selectedCategories: []
                          }));
                          setSearchQuery('');
                          handleTriggerScan();
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors"
                      >
                        Reset Filters & Scan Hypixel
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {visibleFlips.map(flip => (
                    <FlipRow
                      key={flip.id}
                      flip={flip}
                      modConnected={modState.isConnected}
                      onSendCommand={handleSendCommand}
                      onInspect={setInspectingFlip}
                      playerPurse={modState.purse}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'companion' && (
          <ModCompanionView
            modState={modState}
            onResetToken={handleResetToken}
            onRevokeToken={handleRevokeToken}
            onToggleMembership={handleToggleMembership}
            onSimulateClient={handleSimulateClient}
            recentCommands={recentCommands}
          />
        )}

        {activeTab === 'portfolio' && (
          <PortfolioView
            recentCommands={recentCommands}
            onClearHistory={handleClearHistory}
          />
        )}

        {activeTab === 'matrix' && (
          <TargetMatrixView />
        )}

        {activeTab === 'modcode' && (
          <ModCompanionView
            modState={modState}
            onResetToken={handleResetToken}
            onRevokeToken={handleRevokeToken}
            onToggleMembership={handleToggleMembership}
            onSimulateClient={handleSimulateClient}
            recentCommands={recentCommands}
          />
        )}
      </main>

      {/* Item Inspect Tooltip Modal */}
      <ItemInspectModal
        flip={inspectingFlip}
        onClose={() => setInspectingFlip(null)}
        onSendCommand={handleSendCommand}
        modConnected={modState.isConnected}
      />

      {/* Connect Minecraft Player Modal */}
      <ConnectPlayerModal
        isOpen={isPlayerModalOpen}
        onClose={() => setIsPlayerModalOpen(false)}
        playerProfile={playerProfile}
        onConnectPlayer={handleConnectPlayer}
        onDisconnectPlayer={handleDisconnectPlayer}
      />
    </div>
  );
}
