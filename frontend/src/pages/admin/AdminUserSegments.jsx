import { useState, useEffect } from 'react';
import PermissionGuard from '../../components/admin/PermissionGuard';
import { Users, AlertTriangle, Clock, TrendingUp, UserX, ArrowUpRight, Crown, Loader2, RefreshCw, Mail } from 'lucide-react';
import { adminAIAPI, adminPanelAPI } from '../../services/adminApi';

const SEGMENT_CONFIG = {
  churnRisk:         { label: 'Churn Risk',          icon: AlertTriangle, color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200',    desc: 'Paid users inactive 14+ days' },
  trialExpiringSoon: { label: 'Trial Expiring',       icon: Clock,         color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', desc: 'Trial ends in ≤3 days' },
  upgradeReady:      { label: 'Upgrade Ready',        icon: ArrowUpRight,  color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200',  desc: 'Free/trial users actively using product' },
  powerUsers:        { label: 'Power Users',          icon: TrendingUp,    color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200',   desc: 'Pro/Enterprise, active daily' },
  neverActive:       { label: 'Never Activated',      icon: UserX,         color: 'text-gray-600',   bg: 'bg-gray-50',   border: 'border-gray-200',   desc: 'No NAICS codes or incomplete onboarding' },
  enterprise:        { label: 'Enterprise',           icon: Crown,         color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', desc: 'Enterprise plan subscribers' },
};

export default function AdminUserSegments() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [active,  setActive]  = useState(null);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await adminAIAPI.getSegments();
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load segments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">User Segments</h1>
          <p className="text-gray-500 text-sm mt-1">AI-powered user segmentation for targeted actions.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 shrink-0 self-start sm:self-auto">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

      {/* Segment Cards */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(SEGMENT_CONFIG).map(([key, cfg]) => {
            const count = data.counts[key] || 0;
            const Icon  = cfg.icon;
            const isActive = active === key;
            return (
              <button key={key} onClick={() => setActive(isActive ? null : key)}
                className={`text-left p-5 rounded-2xl border-2 transition-all ${isActive ? `${cfg.bg} ${cfg.border}` : 'bg-white border-gray-100 hover:border-gray-300'} shadow-sm`}>
                <div className="flex items-start justify-between mb-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.bg} border ${cfg.border}`}>
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <span className={`text-2xl font-bold ${cfg.color}`}>{count}</span>
                </div>
                <p className="font-semibold text-gray-900 text-sm">{cfg.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{cfg.desc}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* User List for Selected Segment */}
      {active && data?.samples[active]?.length > 0 && (
        <div className={`${SEGMENT_CONFIG[active].bg} border ${SEGMENT_CONFIG[active].border} rounded-2xl p-5`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-semibold ${SEGMENT_CONFIG[active].color}`}>
              {SEGMENT_CONFIG[active].label} — Sample Users (top 10)
            </h3>
            <a href={`/admin/campaigns`}
              className={`text-xs font-semibold flex items-center gap-1 ${SEGMENT_CONFIG[active].color} hover:underline`}>
              <Mail className="w-3.5 h-3.5" /> Send Campaign to Segment
            </a>
          </div>
          <div className="space-y-2">
            {data.samples[active].map(u => (
              <div key={u.id} className="bg-white rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.name}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">{u.plan}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
