import { useState } from 'react';
import AdminHowItWorks from '../../components/AdminHowItWorks';
import PermissionGuard from '../../components/admin/PermissionGuard';
import { DollarSign, TrendingUp, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { adminAIAPI } from '../../services/adminApi';

export default function AdminRevenueForecast() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await adminAIAPI.getRevenueForecast();
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load forecast.');
    } finally {
      setLoading(false);
    }
  };

  const maxRev = data ? Math.max(...Object.values(data.monthlyRevenue), 1) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Revenue Forecast<AdminHowItWorks page="revenueForecast" /></h1>
          <p className="text-gray-500 text-sm mt-1">AI-powered revenue analysis and 90-day forecast.</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition disabled:opacity-60 shrink-0 self-start sm:self-auto">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</> : <><Sparkles className="w-4 h-4" /> Load Forecast</>}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

      {data && (
        <>
          {/* MRR Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-2xl p-6">
              <p className="text-purple-200 text-sm font-medium">Estimated MRR</p>
              <p className="text-3xl font-bold mt-1">${data.mrr.toLocaleString()}</p>
              <p className="text-purple-200 text-xs mt-1">Monthly recurring revenue</p>
            </div>
            {data.planCounts.filter(p => ['pro','enterprise','starter'].includes(p._id)).map(p => (
              <div key={p._id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <p className="text-gray-500 text-xs font-medium uppercase capitalize">{p._id} subscribers</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{p.count}</p>
              </div>
            ))}
          </div>

          {/* Revenue Chart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-500" /> Monthly Revenue (Last 6 Months)
            </h3>
            <div className="flex items-end gap-3 h-40">
              {Object.entries(data.monthlyRevenue).map(([month, rev]) => (
                <div key={month} className="flex-1 flex flex-col items-center gap-1">
                  <p className="text-xs font-bold text-gray-700">${(rev/1000).toFixed(1)}k</p>
                  <div className="w-full bg-purple-100 rounded-t-lg relative" style={{ height: `${(rev / maxRev) * 120 + 8}px` }}>
                    <div className="absolute inset-0 bg-purple-600 rounded-t-lg opacity-80" />
                  </div>
                  <p className="text-xs text-gray-400">{month.slice(5)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Analysis */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <h3 className="font-semibold text-gray-900">AI Revenue Analysis & Forecast</h3>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-5 border border-gray-100 max-h-[500px] overflow-y-auto">
              {data.aiAnalysis}
            </pre>
          </div>
        </>
      )}

      {!data && !loading && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
          <DollarSign className="w-14 h-14 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Click "Load Forecast" to see revenue analysis</p>
        </div>
      )}
    </div>
  );
}
