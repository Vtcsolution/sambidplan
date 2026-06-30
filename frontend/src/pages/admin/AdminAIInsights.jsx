import { useState } from 'react';
import AdminHowItWorks from '../../components/AdminHowItWorks';
import { Sparkles, Loader2, RefreshCw, Users, DollarSign, TrendingUp, MessageSquare } from 'lucide-react';
import { adminAIAPI } from '../../services/adminApi';
import PermissionGuard from '../../components/admin/PermissionGuard';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export default function AdminAIInsights() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const generate = async () => {
    setLoading(true); setError('');
    try {
      const res = await adminAIAPI.getInsights();
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate insights.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">AI Platform Insights<AdminHowItWorks page="aiInsights" /></h1>
          <p className="text-gray-500 text-sm mt-1">AI-generated analysis of platform performance, growth opportunities, and risks.</p>
        </div>
        <button onClick={generate} disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-60 shrink-0 self-start sm:self-auto">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : <><Sparkles className="w-4 h-4" /> Generate Insights</>}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

      {data && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users}         label="Total Users"      value={data.stats.totalUsers}     color="bg-blue-500" />
            <StatCard icon={TrendingUp}    label="New (30d)"        value={data.stats.newUsers}       color="bg-green-500" />
            <StatCard icon={DollarSign}    label="Revenue (30d)"    value={`$${data.stats.revenue30d.toLocaleString()}`} color="bg-purple-500" />
            <StatCard icon={MessageSquare} label="Open Inquiries"   value={data.stats.contactInquiries} color="bg-orange-500" />
          </div>

          {/* Plan Distribution */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-3">Plan Distribution</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(data.stats.planMap).map(([plan, count]) => (
                <div key={plan} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-sm font-medium text-gray-700 capitalize">{plan}</span>
                  <span className="text-sm font-bold text-indigo-600">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Analysis */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" /> AI Strategic Analysis
              </h3>
              <button onClick={generate} className="text-xs text-gray-400 hover:text-indigo-600 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Regenerate
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-5 border border-gray-100 max-h-[600px] overflow-y-auto">
              {data.aiAnalysis}
            </pre>
          </div>
        </>
      )}

      {!data && !loading && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
          <Sparkles className="w-14 h-14 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Click "Generate Insights" to run AI analysis</p>
          <p className="text-gray-300 text-sm mt-1">Analyzes users, revenue, plans, and provides strategic recommendations.</p>
        </div>
      )}

      {loading && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-10 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-indigo-800 font-semibold">AI is analyzing your platform...</p>
          <p className="text-indigo-500 text-sm mt-1">This takes 20–30 seconds.</p>
        </div>
      )}
    </div>
  );
}
