import { useState, useEffect } from 'react';
import PermissionGuard from '../../components/admin/PermissionGuard';
import { Activity, CheckCircle, AlertTriangle, XCircle, Loader2, RefreshCw, Database, Zap } from 'lucide-react';
import { adminAIAPI } from '../../services/adminApi';

function StatusBadge({ status }) {
  const map = {
    ok:   { icon: CheckCircle,  color: 'text-green-600 bg-green-50 border-green-200',  label: 'OK' },
    warn: { icon: AlertTriangle,color: 'text-yellow-600 bg-yellow-50 border-yellow-200',label: 'Warning' },
    error:{ icon: XCircle,      color: 'text-red-600 bg-red-50 border-red-200',        label: 'Error' },
  };
  const cfg = map[status] || map.ok;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${cfg.color}`}>
      <Icon className="w-3.5 h-3.5" /> {cfg.label}
    </span>
  );
}

export default function AdminPlatformHealth() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await adminAIAPI.getHealth();
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to check platform health.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const overallStatus = data
    ? data.metrics.some(m => m.status === 'warn') ||
      data.apiStatus.some(a => a.status === 'error' || a.status === 'warn')
      ? 'warn' : 'ok'
    : 'ok';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Platform Health</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time status of all platform components and external APIs.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
          {data && <StatusBadge status={overallStatus} />}
          <button onClick={load} disabled={loading} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Refresh
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

      {loading && !data && (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
      )}

      {data && (
        <>
          {/* Platform Metrics */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-indigo-500" />
              <h3 className="font-semibold text-gray-900">Platform Metrics</h3>
            </div>
            <div className="space-y-3">
              {data.metrics.map(m => (
                <div key={m.name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{m.name}</p>
                    <p className="text-xs text-gray-400">{m.value.toLocaleString()} {m.unit}</p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
              ))}
            </div>
          </div>

          {/* External API Status */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-orange-500" />
              <h3 className="font-semibold text-gray-900">External API Status</h3>
            </div>
            <div className="space-y-3">
              {data.apiStatus.map(api => (
                <div key={api.name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{api.name}</p>
                    <p className="text-xs text-gray-400">
                      HTTP {api.code}
                      {api.code === 429 && ' — Rate limited (API is up, quota resets hourly)'}
                      {api.code === 404 && ' — Endpoint not found'}
                    </p>
                  </div>
                  <StatusBadge status={api.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Scheduler Status */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold text-gray-900">Automated Schedulers</h3>
            </div>
            <div className="space-y-3">
              {[
                { name: 'SAM.gov Data Fetch (per NAICS)',  schedule: 'Every 60 min',              status: 'ok' },
                { name: 'Nightly Bulk Download (all)',     schedule: 'Daily 04:00 UTC (09:00 PKT)', status: 'ok' },
                { name: 'Opportunity Distribution',        schedule: 'Every hour + 06:00 UTC',     status: 'ok' },
                { name: 'Deadline Reminders',              schedule: 'Daily at 7 AM',              status: 'ok' },
                { name: 'Trial Reminders',                 schedule: 'Every hour',                 status: 'ok' },
                { name: 'Daily Digest Emails',             schedule: 'Daily at 8 AM',              status: 'ok' },
                { name: 'Weekly Market Research',          schedule: 'Mondays at 6 AM',            status: 'ok' },
                { name: 'Certification Expiry Alerts',     schedule: 'Daily at 7 AM',              status: 'ok' },
              ].map(s => (
                <div key={s.name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.schedule}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-400 text-right">Last checked: {new Date(data.checkedAt).toLocaleString()}</p>
        </>
      )}
    </div>
  );
}
