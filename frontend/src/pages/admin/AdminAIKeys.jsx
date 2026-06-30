import { useState, useEffect } from 'react';
import {
  Key, RefreshCw, Loader, CheckCircle, XCircle, AlertTriangle,
  Cpu, Zap, Brain, DollarSign, BarChart3, Shield, Clock,
  ExternalLink, Copy, CheckCheck, Activity
} from 'lucide-react';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
function authH() {
  const t = localStorage.getItem('adminToken');
  return { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' };
}

const MODEL_TIER_COLORS = {
  'Claude Sonnet 4.6': 'bg-blue-100 text-blue-700',
  'Claude Opus 4.8': 'bg-violet-100 text-violet-700',
  'Claude Opus 4.8 (Heavy)': 'bg-rose-100 text-rose-700',
};

function StatusDot({ valid, configured }) {
  if (!configured) return <span className="w-2.5 h-2.5 rounded-full bg-gray-300" title="Not configured" />;
  return valid
    ? <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" title="Active" />
    : <span className="w-2.5 h-2.5 rounded-full bg-red-500" title="Error" />;
}

function fmtNum(n) {
  if (!n) return '—';
  const num = Number(n);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return num.toLocaleString();
}

function ProviderCard({ data, name, icon, color, gradient, logo, links }) {
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const copyKey = () => {
    if (data.maskedKey) {
      navigator.clipboard.writeText(data.maskedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className={`${gradient} p-5`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
              {icon}
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">{name}</h3>
              <p className="text-white/70 text-xs">{data.provider || name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusDot valid={data.valid} configured={data.configured} />
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              !data.configured ? 'bg-white/20 text-white/70' :
              data.valid ? 'bg-white/20 text-white' : 'bg-red-500/30 text-white'
            }`}>
              {!data.configured ? 'Not Configured' : data.valid ? 'Active' : 'Error'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {!data.configured ? (
          <div className="text-center py-6">
            <Key className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">API key not configured</p>
            <p className="text-xs text-gray-400 mt-1">Add the API key in Admin → Settings</p>
          </div>
        ) : (
          <>
            {/* API Key */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">API Key</p>
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <Key className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-sm font-mono text-gray-600 flex-1 truncate">{data.maskedKey}</span>
                <button onClick={copyKey} className="text-gray-400 hover:text-gray-600 shrink-0">
                  {copied ? <CheckCheck className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {data.error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{data.error}</span>
              </div>
            )}

            {/* Tier */}
            {data.tier && (
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-500">Account Tier:</span>
                <span className="text-xs font-bold text-indigo-600">{data.tier}</span>
              </div>
            )}

            {/* Rate Limits */}
            {data.rateLimit && Object.values(data.rateLimit).some(v => v) && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Rate Limits</p>
                <div className="grid grid-cols-2 gap-2">
                  {data.rateLimit.requestsLimit && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Requests</p>
                      <p className="text-lg font-bold text-gray-900">
                        {fmtNum(data.rateLimit.requestsRemaining)}
                        <span className="text-xs font-normal text-gray-400"> / {fmtNum(data.rateLimit.requestsLimit)}</span>
                      </p>
                      <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1.5 overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, (Number(data.rateLimit.requestsRemaining) / Number(data.rateLimit.requestsLimit)) * 100)}%` }} />
                      </div>
                    </div>
                  )}
                  {data.rateLimit.tokensLimit && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Tokens</p>
                      <p className="text-lg font-bold text-gray-900">
                        {fmtNum(data.rateLimit.tokensRemaining)}
                        <span className="text-xs font-normal text-gray-400"> / {fmtNum(data.rateLimit.tokensLimit)}</span>
                      </p>
                      <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1.5 overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (Number(data.rateLimit.tokensRemaining) / Number(data.rateLimit.tokensLimit)) * 100)}%` }} />
                      </div>
                    </div>
                  )}
                  {data.rateLimit.inputTokensLimit && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Input Tokens</p>
                      <p className="text-lg font-bold text-gray-900">
                        {fmtNum(data.rateLimit.inputTokensRemaining)}
                        <span className="text-xs font-normal text-gray-400"> / {fmtNum(data.rateLimit.inputTokensLimit)}</span>
                      </p>
                    </div>
                  )}
                  {data.rateLimit.outputTokensLimit && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Output Tokens</p>
                      <p className="text-lg font-bold text-gray-900">
                        {fmtNum(data.rateLimit.outputTokensRemaining)}
                        <span className="text-xs font-normal text-gray-400"> / {fmtNum(data.rateLimit.outputTokensLimit)}</span>
                      </p>
                    </div>
                  )}
                </div>
                {data.rateLimit.requestsReset && (
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Resets: {
                      data.rateLimit.requestsReset.includes('T')
                        ? new Date(data.rateLimit.requestsReset).toLocaleTimeString()
                        : data.rateLimit.requestsReset
                    }
                  </p>
                )}
              </div>
            )}

            {/* Billing / Credit Balance (if OpenAI returns it) */}
            {data.billing && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Account Balance</p>
                <div className="grid grid-cols-2 gap-2">
                  {data.billing.total_granted != null && (
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Credits Granted</p>
                      <p className="text-lg font-bold text-green-700">${Number(data.billing.total_granted / 100).toFixed(2)}</p>
                    </div>
                  )}
                  {data.billing.total_used != null && (
                    <div className="bg-amber-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Credits Used</p>
                      <p className="text-lg font-bold text-amber-700">${Number(data.billing.total_used / 100).toFixed(2)}</p>
                    </div>
                  )}
                  {data.billing.total_available != null && (
                    <div className="bg-blue-50 rounded-lg p-3 col-span-2">
                      <p className="text-xs text-gray-500">Balance Remaining</p>
                      <p className="text-xl font-bold text-blue-700">${Number(data.billing.total_available / 100).toFixed(2)}</p>
                    </div>
                  )}
                  {data.billing.hard_limit_usd != null && (
                    <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                      <p className="text-xs text-gray-500">Monthly Limit</p>
                      <p className="text-lg font-bold text-gray-700">${Number(data.billing.hard_limit_usd).toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Real Token Usage — tracked from actual API calls */}
            {data.tokenStats?.totals && (data.tokenStats.totals.calls > 0 || data.configured) && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Real Usage This Month
                  <span className="text-gray-400 font-normal ml-1">(tracked from API calls)</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-indigo-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">API Calls</p>
                    <p className="text-xl font-bold text-indigo-700">{(data.tokenStats.totals.calls || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-rose-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Actual Cost</p>
                    <p className="text-xl font-bold text-rose-700">${(data.tokenStats.totals.totalCost || 0).toFixed(4)}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Input Tokens</p>
                    <p className="text-lg font-bold text-blue-700">{fmtNum(data.tokenStats.totals.inputTokens)}</p>
                  </div>
                  <div className="bg-violet-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Output Tokens</p>
                    <p className="text-lg font-bold text-violet-700">{fmtNum(data.tokenStats.totals.outputTokens)}</p>
                  </div>
                </div>

                {/* Per-model breakdown */}
                {data.tokenStats.byModel?.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {data.tokenStats.byModel.map(m => (
                      <div key={m._id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <span className="text-xs font-mono text-gray-600">{m._id}</span>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-gray-500">{m.calls} calls</span>
                          <span className="text-gray-500">{fmtNum(m.totalTokens)} tok</span>
                          <span className="font-bold text-indigo-600">${m.totalCost.toFixed(4)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Daily mini chart */}
                {data.tokenStats.daily?.length > 1 && (
                  <div className="mt-3 bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-2">Daily API Spend</p>
                    <div className="flex items-end gap-1 h-12">
                      {(() => {
                        const maxCost = Math.max(...data.tokenStats.daily.map(d => d.cost), 0.0001);
                        return data.tokenStats.daily.map((d, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${d._id}: $${d.cost.toFixed(4)} (${d.calls} calls)`}>
                            <div className="w-full bg-indigo-500 rounded-t" style={{ height: `${Math.max(2, (d.cost / maxCost) * 48)}px` }} />
                          </div>
                        ));
                      })()}
                    </div>
                    <div className="flex justify-between text-[9px] text-gray-400 mt-1">
                      <span>{data.tokenStats.daily[0]?._id?.slice(5)}</span>
                      <span>{data.tokenStats.daily[data.tokenStats.daily.length - 1]?._id?.slice(5)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Live Balance + Usage Links */}
            {(data.billingUrl || data.usageUrl) && (
              <div className="grid grid-cols-2 gap-2">
                {data.billingUrl && (
                  <a href={data.billingUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
                    <DollarSign className="w-3.5 h-3.5" /> Live Balance
                  </a>
                )}
                {data.usageUrl && (
                  <a href={data.usageUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors">
                    <Activity className="w-3.5 h-3.5" /> Live Usage
                  </a>
                )}
              </div>
            )}

            {/* Available Models */}
            {data.models?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Available Models ({data.models.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.models.map(m => (
                    <span key={m} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg font-mono">{m}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            {links?.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                {links.map(l => (
                  <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                    <ExternalLink className="w-3 h-3" /> {l.label}
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminAIKeys() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const r = await fetch(`${BASE}/admin/ai-keys/status`, { headers: authH() });
      const json = await r.json();
      if (json.success) setData(json.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const activeCount = data ? [data.anthropic, data.openai, data.gemini].filter(p => p?.valid).length : 0;
  const configuredCount = data ? [data.anthropic, data.openai, data.gemini].filter(p => p?.configured).length : 0;

  return (
    <div className="p-4 sm:p-6 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Key className="w-6 h-6 text-indigo-600" /> AI Provider Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">Monitor API keys, rate limits, usage & estimated costs across all AI providers</p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Checking…' : 'Refresh All'}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm text-gray-500">Checking API providers…</p>
        </div>
      ) : data && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-xs font-medium text-gray-500 uppercase">Active Providers</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{activeCount} <span className="text-sm font-normal text-gray-400">/ 3</span></p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-xs font-medium text-gray-500 uppercase">AI Calls This Month</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{data.platformUsage?.totalCalls?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
                  <Brain className="w-4 h-4 text-violet-600" />
                </div>
                <p className="text-xs font-medium text-gray-500 uppercase">Credits Consumed</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{data.platformUsage?.totalCredits?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-xs font-medium text-gray-500 uppercase">Real API Cost</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{data.platformUsage?.realCost || '$0.00'}</p>
              {data.platformUsage?.totalTokens > 0 && <p className="text-xs text-gray-400">{fmtNum(data.platformUsage.totalTokens)} tokens</p>}
              <p className="text-xs text-gray-400">{data.platformUsage?.month}</p>
            </div>
          </div>

          {/* Provider cards */}
          <div className="grid lg:grid-cols-3 gap-5 mb-6">
            <ProviderCard
              data={data.anthropic}
              name="Claude (Anthropic)"
              icon={<Brain className="w-5 h-5 text-white" />}
              color="bg-[#D4A574]"
              gradient="bg-gradient-to-r from-[#D4A574] to-[#C4956A]"
              links={[
                { label: 'Console', url: 'https://console.anthropic.com' },
                { label: 'Usage', url: 'https://console.anthropic.com/settings/usage' },
                { label: 'Billing', url: 'https://console.anthropic.com/settings/billing' },
              ]}
            />
            <ProviderCard
              data={data.openai}
              name="GPT (OpenAI)"
              icon={<Cpu className="w-5 h-5 text-white" />}
              color="bg-[#10a37f]"
              gradient="bg-gradient-to-r from-[#10a37f] to-[#0d8c6d]"
              links={[
                { label: 'Dashboard', url: 'https://platform.openai.com' },
                { label: 'Usage', url: 'https://platform.openai.com/usage' },
                { label: 'Billing', url: 'https://platform.openai.com/settings/organization/billing/overview' },
              ]}
            />
            <ProviderCard
              data={data.gemini}
              name="Gemini (Google)"
              icon={<Zap className="w-5 h-5 text-white" />}
              color="bg-[#4285F4]"
              gradient="bg-gradient-to-r from-[#4285F4] to-[#1a73e8]"
              links={[
                { label: 'AI Studio', url: 'https://aistudio.google.com' },
                { label: 'API Keys', url: 'https://aistudio.google.com/app/apikey' },
                { label: 'Pricing', url: 'https://ai.google.dev/pricing' },
              ]}
            />
          </div>

          {/* Platform usage by model */}
          {data.platformUsage?.byModel?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-indigo-500" /> Platform AI Usage by Model — {data.platformUsage.month}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Model</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">API Calls</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Credits Used</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Usage Bar</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.platformUsage.byModel.map(m => {
                      const pct = data.platformUsage.totalCredits > 0 ? Math.round(m.totalCredits / data.platformUsage.totalCredits * 100) : 0;
                      return (
                        <tr key={m._id} className="border-t border-gray-100">
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${MODEL_TIER_COLORS[m._id] || 'bg-gray-100 text-gray-600'}`}>
                              {m._id}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-medium">{m.totalCalls.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center font-bold text-indigo-600">{m.totalCredits.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-500">{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td className="px-4 py-3 font-bold text-gray-900">Total</td>
                      <td className="px-4 py-3 text-center font-bold">{data.platformUsage.totalCalls.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center font-bold text-indigo-600">{data.platformUsage.totalCredits.toLocaleString()}</td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3 text-right font-bold">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
