import React, { useState } from 'react';
import { ModConnectionState, ModCommand, MembershipTier } from '../types/skyblock';
import { formatCoins, formatSyncTime } from '../utils/formatters';
import { 
  getFabricModSource, 
  getFabricModJson, 
  getFabricBuildGradle, 
  getConfigFileContent, 
  getChatTriggersScript 
} from '../data/modTemplates';
import { 
  Copy, Check, RefreshCw, Terminal, Radio, ShieldCheck, 
  Code, Download, Play, Square, Laptop, Zap, Layers, FileJson, 
  Cpu, Key, Crown, AlertTriangle, ShieldX, Eye, EyeOff, Lock
} from 'lucide-react';

interface ModCompanionViewProps {
  modState: ModConnectionState;
  onResetToken: () => void;
  onRevokeToken: () => void;
  onToggleMembership: (tier: MembershipTier) => void;
  onSimulateClient: (data: { ign: string; purse: number; bank: number; location: string; isConnected: boolean }) => void;
  recentCommands: ModCommand[];
}

export const ModCompanionView: React.FC<ModCompanionViewProps> = ({
  modState,
  onResetToken,
  onRevokeToken,
  onToggleMembership,
  onSimulateClient,
  recentCommands
}) => {
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [copiedPowerShell, setCopiedPowerShell] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedJavaClient, setCopiedJavaClient] = useState(false);
  const [copiedJava, setCopiedJava] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedGradle, setCopiedGradle] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [copiedCT, setCopiedCT] = useState(false);
  const [showToken, setShowToken] = useState(false);

  // Simulator controls tailored for SeikeyoFlipper Fabric 26.2
  const [simIgn, setSimIgn] = useState(modState.ign !== 'Not Connected' ? modState.ign : 'derptastic41');
  const [simUuid, setSimUuid] = useState(modState.playerUuid || '8a0fc6bfb05b9138459336837df3ebac');
  const [simPurse, setSimPurse] = useState(modState.purse > 0 ? modState.purse : 1_500_000);
  const [simBank, setSimBank] = useState(modState.bank > 0 ? modState.bank : 0);
  const [simResponse, setSimResponse] = useState<any>(null);
  const [isSimSyncing, setIsSimSyncing] = useState(false);

  const [activeTab, setActiveTab] = useState<'setup' | 'powershell' | 'fabric' | 'modjson' | 'gradle' | 'simulator' | 'config'>('setup');

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
  const syncEndpoint = `${originUrl}/api/mod/sync`;
  const isPro = modState.membershipTier === 'pro';

  const powerShellCommand = `Invoke-RestMethod -Uri "${syncEndpoint}" -Method POST -Headers @{"Content-Type"="application/json";"X-Mod-Key"="${modState.token}";"Authorization"="Bearer ${modState.token}"} -Body '{"token":"${modState.token}","ign":"${modState.ign !== 'Not Connected' ? modState.ign : 'MinecraftUsername'}","purse":1500000,"modVersion":"26.2.0-FABRIC","clientType":"FABRIC_26_2"}'`;

  const curlCommand = `curl -X POST "${syncEndpoint}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${modState.token}" \\
  -H "X-Mod-Key: ${modState.token}" \\
  -d '{"token":"${modState.token}","ign":"${modState.ign !== 'Not Connected' ? modState.ign : 'MinecraftUsername'}","purse":1500000,"modVersion":"26.2.0-FABRIC","clientType":"FABRIC_26_2"}'`;

  const copyToClipboard = (text: string, setFn: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setFn(true);
    setTimeout(() => setFn(false), 2000);
  };

  const handleManualSyncTest = async () => {
    setIsSimSyncing(true);
    try {
      const res = await fetch('/api/mod/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${modState.token}`,
          'X-Mod-Key': modState.token
        },
        body: JSON.stringify({
          token: modState.token,
          uuid: simUuid,
          minecraftUuid: simUuid,
          ign: simIgn,
          purse: simPurse,
          purseBalance: simPurse,
          bank: simBank,
          modVersion: '26.2.0-FABRIC',
          clientType: 'FABRIC_26_2'
        })
      });
      const data = await res.json();
      setSimResponse(data);
    } catch (e: any) {
      setSimResponse({ success: false, error: e.message });
    } finally {
      setIsSimSyncing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Title & Subheader */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[11px] font-mono font-bold uppercase tracking-wider">
              SeikeyoFlipper · Fabric 26.2 Mod Bridge
            </span>
            <span className="text-slate-500 text-xs">·</span>
            <span className="text-slate-400 text-xs font-mono">HTTPS POST /api/mod/sync (Every 2s)</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Radio className="w-6 h-6 text-amber-400" />
            SeikeyoFlipper Mod Backend Integration
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Secure server-side token authentication, verified Minecraft UUID matching, live purse sync, and non-blocking auction notifications.
          </p>
        </div>

        {/* Tab switch for sub-sections */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-medium overflow-x-auto self-start md:self-auto max-w-full">
          <button
            onClick={() => setActiveTab('setup')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'setup' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Mod Credentials & Tier
          </button>
          <button
            onClick={() => setActiveTab('powershell')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'powershell' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            PowerShell & Java Test
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'simulator' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Live Sync Simulator
          </button>
          <button
            onClick={() => setActiveTab('fabric')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'fabric' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Fabric Java Code
          </button>
          <button
            onClick={() => setActiveTab('modjson')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'modjson' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            fabric.mod.json
          </button>
          <button
            onClick={() => setActiveTab('gradle')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'gradle' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            build.gradle
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'config' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Config JSON
          </button>
        </div>
      </div>

      {/* Connection Status KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#121824] border border-slate-800 rounded-lg p-4">
          <span className="text-xs text-slate-400 block mb-1">SeikeyoFlipper Status</span>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${modState.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="font-bold text-sm text-white">
              {modState.isConnected ? 'CONNECTED & SYNCED' : 'OFFLINE / AWAITING SYNC'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block font-mono">
            Last Sync: {formatSyncTime(modState.lastSyncTime)}
          </span>
        </div>

        <div className="bg-[#121824] border border-slate-800 rounded-lg p-4">
          <span className="text-xs text-slate-400 block mb-1">Membership & Snipe Delay</span>
          <div className="flex items-center gap-1.5">
            {isPro ? (
              <span className="font-mono text-base font-extrabold text-amber-300 flex items-center gap-1">
                <Crown className="w-4 h-4 text-amber-400" />
                PRO TIER
              </span>
            ) : (
              <span className="font-mono text-base font-bold text-cyan-300">
                FREE TIER
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {isPro ? 'Instant 0s snipe notifications' : '10-second artificial delay'}
          </span>
        </div>

        <div className="bg-[#121824] border border-slate-800 rounded-lg p-4">
          <span className="text-xs text-slate-400 block mb-1">Scoreboard Purse Balance</span>
          <div className="font-mono text-base font-bold text-white tabular-nums">
            {formatCoins(modState.purse)} <span className="text-amber-400 text-xs">coins</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Updated via HTTPS POST every 2s
          </span>
        </div>

        <div className="bg-[#121824] border border-slate-800 rounded-lg p-4">
          <span className="text-xs text-slate-400 block mb-1">Verified Minecraft UUID</span>
          <div className="font-mono text-xs font-bold text-slate-300 truncate" title={modState.playerUuid || 'Unbound'}>
            {modState.playerUuid ? `${modState.playerUuid.slice(0, 16)}...` : 'Will bind on first sync'}
          </div>
          <span className="text-[11px] text-emerald-400 mt-1 block">
            {modState.playerUuid ? 'UUID strictly validated' : 'Ready to link'}
          </span>
        </div>
      </div>

      {/* Tab: Setup & Security Credentials */}
      {activeTab === 'setup' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Private Token & Endpoint */}
          <div className="bg-[#121824] border border-slate-800 rounded-lg p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                Private SeikeyoFlipper Mod Token
              </h2>
              {modState.tokenRevoked && (
                <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                  TOKEN REVOKED
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Your mod token is authenticated server-side on every request. Never share this token publicly. It securely links your Fabric 26.2 client to your SkyFlip account.
            </p>

            {/* Token Box */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1.5">
                <span>Secret Mod Token</span>
                <button
                  onClick={() => setShowToken(!showToken)}
                  className="text-slate-400 hover:text-white flex items-center gap-1 font-normal text-[11px]"
                >
                  {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showToken ? 'Hide' : 'Reveal'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type={showToken ? "text" : "password"}
                  readOnly
                  value={modState.token}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono text-xs text-amber-300 focus:outline-none"
                />
                <button
                  onClick={() => copyToClipboard(modState.token, setCopiedToken)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedToken ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Token Actions: Revoke & Generate */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={onResetToken}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Generate Fresh Token
              </button>

              <button
                onClick={onRevokeToken}
                className="px-3 py-2 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-600/40 text-xs font-medium transition-colors flex items-center gap-1.5"
                title="Immediately revokes token so any sync requests with it are rejected with 401"
              >
                <ShieldX className="w-3.5 h-3.5" />
                Revoke Token
              </button>
            </div>

            {/* Sync URL & External Connectivity */}
            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Mod HTTPS POST Sync Endpoint
                  </label>
                  <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-semibold">
                    ✓ AI Studio Cookie Check Bypassed
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={syncEndpoint}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono text-xs text-amber-300 focus:outline-none select-all"
                  />
                  <button
                    onClick={() => copyToClipboard(syncEndpoint, setCopiedEndpoint)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  >
                    {copiedEndpoint ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedEndpoint ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Quick Test Command Strip */}
              <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    Quick PowerShell Test Command
                  </span>
                  <button
                    onClick={() => copyToClipboard(powerShellCommand, setCopiedPowerShell)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
                  >
                    {copiedPowerShell ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedPowerShell ? 'Copied PowerShell' : 'Copy Command'}
                  </button>
                </div>
                <pre className="p-2 bg-slate-950 rounded text-[10px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap break-all select-all">
                  {powerShellCommand}
                </pre>
              </div>
            </div>
          </div>

          {/* Right: Membership Tier & Rate Limiting Rules */}
          <div className="bg-[#121824] border border-slate-800 rounded-lg p-6 space-y-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              Membership Tier & Notification Delay
            </h2>

            <div className="p-4 rounded-lg bg-[#0e131d] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-300 block">Current Membership</span>
                  <span className="text-sm font-bold text-white font-mono uppercase">
                    {isPro ? 'Pro Member (Instant)' : 'Free Member (10s Delay)'}
                  </span>
                </div>
                <button
                  onClick={() => onToggleMembership(isPro ? 'free' : 'pro')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isPro 
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/10'
                  }`}
                >
                  {isPro ? 'Switch to Free Tier' : 'Upgrade to Pro Tier'}
                </button>
              </div>

              <div className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${!isPro ? 'bg-cyan-400' : 'bg-slate-600'}`} />
                  <span><strong>Free Tier:</strong> Notifications delivered after a <strong>10-second artificial delay</strong>.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isPro ? 'bg-amber-400' : 'bg-slate-600'}`} />
                  <span><strong>Pro Tier:</strong> Notifications delivered immediately with <strong>0-second instant speed</strong>.</span>
                </div>
              </div>
            </div>

            {/* Rate Limiting & Safety Contract */}
            <div className="space-y-2.5 text-xs text-slate-300">
              <h3 className="font-semibold text-slate-400 uppercase tracking-wider text-[11px]">
                Backend Rate Limiting & Safety Enforcement
              </h3>
              <ul className="space-y-2 list-disc list-inside text-slate-400">
                <li><strong className="text-slate-300">Sync Interval:</strong> Expected every 2 seconds. Sliding rate limit of max 40 requests/minute. Returns <code className="text-amber-300 font-mono">429 Too Many Requests</code> if flooded.</li>
                <li><strong className="text-slate-300">UUID Matching:</strong> Token is matched to your verified Minecraft UUID. Requests from mismatched UUIDs are rejected with <code className="text-rose-300 font-mono">403 Forbidden</code>.</li>
                <li><strong className="text-slate-300">Duplicate Prevention:</strong> Delivered auction UUIDs are tracked per player across repeated syncs, guaranteeing zero repeat alerts.</li>
                <li><strong className="text-slate-300">Safe Commands Only:</strong> Returned commands are strictly <code className="text-cyan-300 font-mono">/viewauction &lt;UUID&gt;</code>. Arbitrary command execution is impossible.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab: PowerShell & Java HttpClient Testing */}
      {activeTab === 'powershell' && (
        <div className="space-y-6">
          {/* Status Alert Banner */}
          <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-500/40 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            <div className="text-xs text-slate-300 space-y-1">
              <span className="font-bold text-emerald-300 block text-sm">
                Production Endpoint Configured: Cookie Check Bypassed
              </span>
              <p className="leading-relaxed">
                The <code className="font-mono text-amber-300">/api/mod/sync</code> route is configured with direct reverse-proxy pass-through and full CORS headers. External non-browser clients (PowerShell <code className="font-mono text-cyan-300">Invoke-RestMethod</code>, Java <code className="font-mono text-cyan-300">HttpClient</code>, and Python) authenticate solely with your private token without encountering Google AI Studio session cookie redirects.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PowerShell Card */}
            <div className="bg-[#121824] border border-slate-800 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-base font-bold text-white">PowerShell Test Command</h2>
                </div>
                <button
                  onClick={() => copyToClipboard(powerShellCommand, setCopiedPowerShell)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  {copiedPowerShell ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedPowerShell ? 'Copied PowerShell' : 'Copy One-Liner'}
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Run this command in any Windows PowerShell or PowerShell 7 terminal. It sends the player token, IGN, and purse balance, returning pure JSON.
              </p>

              <pre className="bg-[#0b0e14] border border-slate-800 rounded-lg p-3.5 font-mono text-xs text-cyan-300 overflow-x-auto whitespace-pre-wrap break-all select-all leading-relaxed">
                {powerShellCommand}
              </pre>

              <div className="pt-2">
                <span className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Full PowerShell Script (with Exception Inspection)
                </span>
                <pre className="bg-[#0b0e14] border border-slate-800 rounded-lg p-3.5 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-[220px] select-all leading-relaxed">
{`$headers = @{
    "Content-Type"  = "application/json"
    "Authorization" = "Bearer ${modState.token}"
    "X-Mod-Key"     = "${modState.token}"
}
$body = @{
    token        = "${modState.token}"
    uuid         = "${modState.playerUuid || '8a0fc6bfb05b9138459336837df3ebac'}"
    ign          = "${modState.ign !== 'Not Connected' ? modState.ign : 'MinecraftUsername'}"
    purse        = 1500000
    purseBalance = 1500000
    modVersion   = "26.2.0-FABRIC"
    clientType   = "FABRIC_26_2"
} | ConvertTo-Json

$res = Invoke-RestMethod -Uri "${syncEndpoint}" -Method POST -Headers $headers -Body $body
$res | ConvertTo-Json -Depth 4`}
                </pre>
              </div>
            </div>

            {/* Java HttpClient Card */}
            <div className="bg-[#121824] border border-slate-800 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code className="w-5 h-5 text-amber-400" />
                  <h2 className="text-base font-bold text-white">Java HttpClient (Fabric 26.2)</h2>
                </div>
                <button
                  onClick={() => copyToClipboard(`// Java 11+ HttpClient for SeikeyoFlipper Fabric 26.2
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

public class ModSyncClient {
    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(4))
                .build();

        String payload = """
        {
          "token": "${modState.token}",
          "uuid": "${modState.playerUuid || '8a0fc6bfb05b9138459336837df3ebac'}",
          "ign": "${modState.ign !== 'Not Connected' ? modState.ign : 'MinecraftUsername'}",
          "purse": 1500000,
          "modVersion": "26.2.0-FABRIC",
          "clientType": "FABRIC_26_2"
        }
        """;

        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create("${syncEndpoint}"))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer ${modState.token}")
                .header("X-Mod-Key", "${modState.token}")
                .timeout(Duration.ofSeconds(4))
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build();

        HttpResponse<String> res = client.send(req, HttpResponse.BodyHandlers.ofString());
        System.out.println("Status: " + res.statusCode());
        System.out.println("JSON: " + res.body());
    }
}`, setCopiedJavaClient)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  {copiedJavaClient ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedJavaClient ? 'Copied Java' : 'Copy Java Snippet'}
                </button>
              </div>

              <p className="text-xs text-slate-400">
                The exact snippet used inside your Minecraft Java client mod. Works on Java 17/21/25 with zero external dependencies.
              </p>

              <pre className="bg-[#0b0e14] border border-slate-800 rounded-lg p-3.5 font-mono text-xs text-amber-200/90 overflow-x-auto max-h-[340px] select-all leading-relaxed">
{`// Java 11+ HttpClient for SeikeyoFlipper Fabric 26.2
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

HttpClient client = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(4))
        .build();

String payload = """
{
  "token": "${modState.token}",
  "uuid": "${modState.playerUuid || '8a0fc6bfb05b9138459336837df3ebac'}",
  "ign": "${modState.ign !== 'Not Connected' ? modState.ign : 'MinecraftUsername'}",
  "purse": 1500000,
  "modVersion": "26.2.0-FABRIC",
  "clientType": "FABRIC_26_2"
}
""";

HttpRequest req = HttpRequest.newBuilder()
        .uri(URI.create("${syncEndpoint}"))
        .header("Content-Type", "application/json")
        .header("Authorization", "Bearer ${modState.token}")
        .header("X-Mod-Key", "${modState.token}")
        .timeout(Duration.ofSeconds(4))
        .POST(HttpRequest.BodyPublishers.ofString(payload))
        .build();

HttpResponse<String> res = client.send(req, HttpResponse.BodyHandlers.ofString());
System.out.println("Status: " + res.statusCode());
System.out.println("Body: " + res.body());`}
              </pre>

              {/* cURL alternative */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-slate-300">Terminal cURL Command</span>
                  <button
                    onClick={() => copyToClipboard(curlCommand, setCopiedCurl)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    {copiedCurl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedCurl ? 'Copied' : 'Copy cURL'}
                  </button>
                </div>
                <pre className="bg-[#0b0e14] border border-slate-800 rounded p-2 text-[10px] font-mono text-slate-400 overflow-x-auto whitespace-pre-wrap select-all">
                  {curlCommand}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Live Simulator */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-[#121824] border border-slate-800 rounded-lg p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-amber-400" />
              SeikeyoFlipper Sync Simulator
            </h2>
            <p className="text-xs text-slate-400">
              Simulate the exact HTTPS POST payload sent by the SeikeyoFlipper Fabric 26.2 client mod every 2 seconds.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Player IGN</label>
                <input
                  type="text"
                  value={simIgn}
                  onChange={(e) => setSimIgn(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Minecraft Player UUID</label>
                <input
                  type="text"
                  value={simUuid}
                  onChange={(e) => setSimUuid(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Purse Balance (Coins)</label>
                <input
                  type="number"
                  value={simPurse}
                  onChange={(e) => setSimPurse(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-mono"
                />
                <span className="text-[10px] text-amber-400 mt-1 block">
                  Formatted: {formatCoins(simPurse)} coins
                </span>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleManualSyncTest}
                  disabled={isSimSyncing}
                  className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-md shadow-amber-500/10"
                >
                  <RefreshCw className={`w-4 h-4 ${isSimSyncing ? 'animate-spin' : ''}`} />
                  Send POST /api/mod/sync (Test Packet)
                </button>
              </div>
            </div>
          </div>

          {/* Response Payload Inspector */}
          <div className="lg:col-span-2 bg-[#121824] border border-slate-800 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Laptop className="w-5 h-5 text-cyan-400" />
                Live Server Response (SeikeyoFlipper JSON Payload)
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                {isPro ? 'Pro Mode (0s delay)' : 'Free Mode (10s delay)'}
              </span>
            </div>

            <div className="bg-[#0b0e14] border border-slate-800 rounded-lg p-4 font-mono text-xs overflow-x-auto min-h-[300px] select-all">
              {simResponse ? (
                <pre className="text-amber-200/90 leading-relaxed">
                  {JSON.stringify(simResponse, null, 2)}
                </pre>
              ) : (
                <div className="text-slate-500 italic py-12 text-center space-y-2">
                  <p>Click "Send POST /api/mod/sync" to test real server-side token authentication, UUID verification, and auction command delivery.</p>
                  <p className="text-[11px] text-slate-600">
                    If on Free tier, snipes under 10 seconds old are delayed; upgrade to Pro to receive them with 0-second latency.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Fabric Java Source Code */}
      {activeTab === 'fabric' && (
        <div className="bg-[#121824] border border-slate-800 rounded-lg p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-amber-400 text-xs font-bold uppercase tracking-wider font-mono">
                  src/main/java/com/seikeyoflipper/companion/SeikeyoFlipperFabricClient.java
                </span>
              </div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Code className="w-5 h-5 text-amber-400" />
                SeikeyoFlipperFabricClient.java (Fabric 26.2)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Ready-to-drop ClientModInitializer sending scoreboard purse balances and rendering clickable chat /viewauction links.
              </p>
            </div>

            <button
              onClick={() => copyToClipboard(getFabricModSource(originUrl, modState.token), setCopiedJava)}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              {copiedJava ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedJava ? 'Copied Source' : 'Copy SeikeyoFlipperFabricClient.java'}
            </button>
          </div>

          <pre className="bg-[#0b0e14] border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-[520px] leading-relaxed select-all">
            {getFabricModSource(originUrl, modState.token)}
          </pre>
        </div>
      )}

      {/* Tab: fabric.mod.json */}
      {activeTab === 'modjson' && (
        <div className="bg-[#121824] border border-slate-800 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider">
                src/main/resources/fabric.mod.json
              </span>
              <h2 className="text-base font-bold text-white mt-1">Fabric Mod Manifest (fabric.mod.json)</h2>
            </div>
            <button
              onClick={() => copyToClipboard(getFabricModJson(originUrl), setCopiedJson)}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              {copiedJson ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedJson ? 'Copied JSON' : 'Copy fabric.mod.json'}
            </button>
          </div>
          <pre className="bg-[#0b0e14] border border-slate-800 rounded-lg p-4 font-mono text-xs text-amber-200/90 overflow-x-auto leading-relaxed select-all">
            {getFabricModJson(originUrl)}
          </pre>
        </div>
      )}

      {/* Tab: build.gradle */}
      {activeTab === 'gradle' && (
        <div className="bg-[#121824] border border-slate-800 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-purple-400 text-xs font-mono font-bold uppercase tracking-wider">
                build.gradle (Fabric Loom)
              </span>
              <h2 className="text-base font-bold text-white mt-1">SeikeyoFlipper Fabric 26.2 Gradle Configuration</h2>
            </div>
            <button
              onClick={() => copyToClipboard(getFabricBuildGradle(), setCopiedGradle)}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              {copiedGradle ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedGradle ? 'Copied Gradle' : 'Copy build.gradle'}
            </button>
          </div>
          <pre className="bg-[#0b0e14] border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed select-all">
            {getFabricBuildGradle()}
          </pre>
        </div>
      )}

      {/* Tab: Config JSON */}
      {activeTab === 'config' && (
        <div className="bg-[#121824] border border-slate-800 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-amber-400 text-xs font-mono font-bold uppercase tracking-wider">
                .minecraft/config/seikeyoflipper.json
              </span>
              <h2 className="text-base font-bold text-white mt-1">SeikeyoFlipper Configuration (seikeyoflipper.json)</h2>
            </div>
            <button
              onClick={() => copyToClipboard(getConfigFileContent(originUrl, modState.token), setCopiedConfig)}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              {copiedConfig ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedConfig ? 'Copied Config' : 'Copy seikeyoflipper.json'}
            </button>
          </div>
          <pre className="bg-[#0b0e14] border border-slate-800 rounded-lg p-4 font-mono text-xs text-amber-200/90 overflow-x-auto leading-relaxed select-all">
            {getConfigFileContent(originUrl, modState.token)}
          </pre>
        </div>
      )}
    </div>
  );
};
