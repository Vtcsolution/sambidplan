import { useState, useEffect, useCallback } from 'react';
import {
  Coins, Search, RefreshCw, Loader, ChevronLeft, ChevronRight,
  Download, Send, Calendar, Filter, Users, BarChart3, Eye,
  TrendingUp, Zap, Brain, FileText, X, ArrowUpDown
} from 'lucide-react';
import jsPDF from 'jspdf';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
function authH() {
  const t = localStorage.getItem('adminToken');
  return { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' };
}
async function api(path) {
  const r = await fetch(`${BASE}/admin${path}`, { headers: authH() });
  return r.json();
}
async function apiPost(path, body) {
  const r = await fetch(`${BASE}/admin${path}`, { method: 'POST', headers: authH(), body: JSON.stringify(body) });
  return r.json();
}

const TIER_COLORS = {
  'Claude Sonnet 4.6': 'bg-blue-100 text-blue-700',
  'Claude Opus 4.8': 'bg-violet-100 text-violet-700',
  'Claude Opus 4.8 (Heavy)': 'bg-rose-100 text-rose-700',
};

function StatCard({ icon: Icon, label, value, sub, color = 'bg-indigo-50 text-indigo-600' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function generatePDF(logs, user, monthLabel, totalCredits) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const ML = 14, MR = 14;
  const CW = W - ML - MR;

  // Header
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, W, 35, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(255, 255, 255);
  doc.text('AI Credits Usage Report', ML, 16);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text(monthLabel, ML, 24);
  if (user) {
    doc.text(`${user.businessName || user.userName || ''} — ${user.userEmail || ''}`, ML, 30);
  }

  // Summary box
  let y = 44;
  doc.setFillColor(245, 245, 255);
  doc.roundedRect(ML, y, CW, 16, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(79, 70, 229);
  doc.text(`Total Credits Used: ${totalCredits}`, ML + 6, y + 7);
  doc.text(`Total AI Calls: ${logs.length}`, ML + 80, y + 7);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(107, 114, 128);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, W - MR, y + 7, { align: 'right' });

  // Table header
  y += 24;
  const cols = [
    { label: '#',          w: 8 },
    { label: 'Date',       w: 22 },
    { label: 'Time',       w: 18 },
    { label: 'User',       w: 35 },
    { label: 'Feature',    w: 38 },
    { label: 'Model',      w: 32 },
    { label: 'Opportunity', w: 0 },
    { label: 'Credits',    w: 14 },
  ];
  cols[6].w = CW - cols.reduce((s, c, i) => i !== 6 ? s + c.w : s, 0);

  doc.setFillColor(243, 244, 246);
  doc.rect(ML, y - 4, CW, 8, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(107, 114, 128);
  let cx = ML;
  cols.forEach(c => { doc.text(c.label.toUpperCase(), cx + 2, y); cx += c.w; });
  y += 7;

  // Table rows
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(55, 65, 81);
  logs.forEach((log, i) => {
    if (y > H - 20) { doc.addPage(); y = 16; }
    const d = new Date(log.createdAt);
    cx = ML;
    const row = [
      String(i + 1),
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      (log.userName || log.userEmail || '').substring(0, 22),
      (log.featureLabel || log.feature).substring(0, 24),
      (log.model || '').substring(0, 20),
      (log.opportunityTitle || '—').substring(0, 30),
      String(log.creditsUsed),
    ];
    if (i % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(ML, y - 3.5, CW, 6, 'F'); }
    doc.setTextColor(55, 65, 81);
    row.forEach((val, ci) => {
      if (ci === row.length - 1) {
        doc.setFont('helvetica', 'bold'); doc.setTextColor(79, 70, 229);
        doc.text(val, cx + cols[ci].w - 2, y, { align: 'right' });
        doc.setFont('helvetica', 'normal'); doc.setTextColor(55, 65, 81);
      } else {
        doc.text(val, cx + 2, y);
      }
      cx += cols[ci].w;
    });
    y += 6;
  });

  // Total row
  y += 2;
  doc.setFillColor(238, 238, 255);
  doc.rect(ML, y - 4, CW, 8, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(79, 70, 229);
  doc.text('TOTAL', ML + 4, y);
  doc.text(String(totalCredits), ML + CW - 2, y, { align: 'right' });

  // Footer
  const pages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(156, 163, 175);
    doc.text('SamBid — AI Credits Report', ML, H - 6);
    doc.text(`Page ${p} of ${pages}`, W - MR, H - 6, { align: 'right' });
  }

  const name = user ? `credits-${(user.businessName || user.userName || 'report').replace(/\s+/g, '-')}` : 'credits-report';
  doc.save(`${name}.pdf`);
}

export default function AdminCreditUsage() {
  const [view, setView] = useState('summary');
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsPages, setLogsPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetail, setUserDetail] = useState(null);

  // Filters
  const [filterFeature, setFilterFeature] = useState('');
  const [filterBusiness, setFilterBusiness] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth());
  const [filterYear, setFilterYear] = useState(now.getFullYear());

  const loadSummary = useCallback(async () => {
    setLoading(true);
    const r = await api(`/credits/summary?month=${filterMonth}&year=${filterYear}`);
    if (r.success) setSummary(r.data);
    setLoading(false);
  }, [filterMonth, filterYear]);

  const loadLogs = useCallback(async (page = 1) => {
    setLoading(true);
    let q = `/credits/logs?page=${page}&limit=30&sort=-createdAt`;
    if (filterFeature) q += `&feature=${filterFeature}`;
    if (filterBusiness) q += `&businessName=${encodeURIComponent(filterBusiness)}`;
    if (filterDateFrom) q += `&dateFrom=${filterDateFrom}`;
    if (filterDateTo) q += `&dateTo=${filterDateTo}`;
    const r = await api(q);
    if (r.success) { setLogs(r.data); setLogsTotal(r.total); setLogsPage(r.page); setLogsPages(r.pages); }
    setLoading(false);
  }, [filterFeature, filterBusiness, filterDateFrom, filterDateTo]);

  const loadUserDetail = useCallback(async (userId) => {
    setLoading(true);
    let q = `/credits/user/${userId}?limit=100`;
    if (filterDateFrom) q += `&dateFrom=${filterDateFrom}`;
    if (filterDateTo) q += `&dateTo=${filterDateTo}`;
    const r = await api(q);
    if (r.success) setUserDetail(r.data);
    setLoading(false);
  }, [filterDateFrom, filterDateTo]);

  useEffect(() => {
    if (view === 'summary') loadSummary();
    else if (view === 'logs') loadLogs(1);
  }, [view, loadSummary, loadLogs]);

  useEffect(() => {
    if (selectedUser) loadUserDetail(selectedUser);
  }, [selectedUser, loadUserDetail]);

  const handleSendReport = async (userId) => {
    setSending(userId);
    const r = await apiPost('/credits/send-report', { userId, month: filterMonth, year: filterYear });
    alert(r.message || 'Sent!');
    setSending(null);
  };

  const handleDownloadPDF = () => {
    const data = userDetail ? userDetail.logs : view === 'logs' ? logs : [];
    const user = userDetail?.user ? {
      userName: userDetail.user.name,
      userEmail: userDetail.user.email,
      businessName: userDetail.user.businessName,
    } : null;
    const total = data.reduce((s, l) => s + l.creditsUsed, 0);
    const ml = summary?.monthLabel || `${filterYear}-${filterMonth + 1}`;
    generatePDF(data, user, ml, total);
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i, label: new Date(2026, i).toLocaleString('en-US', { month: 'long' }),
  }));

  const featureOptions = summary?.featureCosts ? Object.entries(summary.featureCosts).map(([k, v]) => ({
    value: k, label: summary.featureLabels[k] || k, cost: v,
  })) : [];

  return (
    <div className="p-4 sm:p-6 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Coins className="w-6 h-6 text-indigo-600" /> AI Credit Usage
          </h1>
          <p className="text-sm text-gray-500">Track which users, companies, and features consume AI credits</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setView('summary'); setSelectedUser(null); setUserDetail(null); }}
            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 ${view === 'summary' && !selectedUser ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            <BarChart3 className="w-4 h-4" /> Summary
          </button>
          <button onClick={() => { setView('logs'); setSelectedUser(null); setUserDetail(null); }}
            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 ${view === 'logs' && !selectedUser ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            <FileText className="w-4 h-4" /> All Logs
          </button>
        </div>
      </div>

      {/* ── USER DETAIL VIEW ── */}
      {selectedUser && userDetail && (
        <div>
          <button onClick={() => { setSelectedUser(null); setUserDetail(null); }}
            className="flex items-center gap-1 text-sm text-indigo-600 hover:underline mb-4">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <div className="bg-white rounded-xl border p-5 mb-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{userDetail.user?.name || 'User'}</h2>
                <p className="text-sm text-gray-500">{userDetail.user?.email} · {userDetail.user?.businessName || '—'} · Plan: <span className="font-semibold capitalize">{userDetail.user?.plan}</span></p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleDownloadPDF}
                  className="flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700">
                  <Download className="w-4 h-4" /> Download PDF
                </button>
                <button onClick={() => handleSendReport(selectedUser)} disabled={sending === selectedUser}
                  className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50">
                  {sending === selectedUser ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Email Report
                </button>
              </div>
            </div>
          </div>

          {/* Feature breakdown */}
          {userDetail.summary?.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
              {userDetail.summary.map(s => (
                <div key={s._id} className="bg-white rounded-xl border p-4">
                  <p className="text-xs text-gray-500 font-medium">{s.featureLabel}</p>
                  <p className="text-xl font-bold text-indigo-600">{s.totalCredits} <span className="text-xs text-gray-400 font-normal">credits</span></p>
                  <p className="text-xs text-gray-400">{s.totalCalls} calls</p>
                </div>
              ))}
            </div>
          )}

          {/* User's log table */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Time</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Feature</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Model</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Opportunity</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Credits</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {userDetail.logs.map((log, i) => {
                  const d = new Date(log.createdAt);
                  return (
                    <tr key={log._id} className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td className="px-4 py-3 text-gray-500">{d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-4 py-3 font-medium">{log.featureLabel}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_COLORS[log.model] || 'bg-gray-100 text-gray-600'}`}>{log.model}</span></td>
                      <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{log.opportunityTitle || '—'}</td>
                      <td className="px-4 py-3 text-center font-bold text-indigo-600">{log.creditsUsed}</td>
                      <td className="px-4 py-3 text-center text-gray-400">{log.creditsRemaining}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {userDetail.logs.length === 0 && (
              <div className="text-center py-12 text-gray-400"><Coins className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>No usage logs found</p></div>
            )}
          </div>
        </div>
      )}

      {/* ── SUMMARY VIEW ── */}
      {view === 'summary' && !selectedUser && (
        <div>
          {/* Month selector */}
          <div className="flex items-center gap-3 mb-5">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <input type="number" value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-24" min={2024} max={2030} />
            <button onClick={loadSummary} className="p-2 hover:bg-gray-100 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader className="w-8 h-8 animate-spin text-indigo-500" /></div>
          ) : summary && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard icon={Zap} label="Total Credits Used" value={summary.totalCredits} sub={summary.monthLabel} color="bg-indigo-50 text-indigo-600" />
                <StatCard icon={Brain} label="Total AI Calls" value={summary.totalCalls} sub="All features combined" color="bg-violet-50 text-violet-600" />
                <StatCard icon={Users} label="Active Users" value={summary.byUser.length} sub="Used AI this month" color="bg-blue-50 text-blue-600" />
                <StatCard icon={TrendingUp} label="Top Feature" value={summary.byFeature[0]?.featureLabel || '—'} sub={summary.byFeature[0] ? `${summary.byFeature[0].totalCredits} credits` : ''} color="bg-green-50 text-green-600" />
              </div>

              {/* By Feature */}
              <div className="grid lg:grid-cols-2 gap-5 mb-6">
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-indigo-500" /> Credits by Feature</h3>
                  <div className="space-y-3">
                    {summary.byFeature.map(f => {
                      const pct = summary.totalCredits ? Math.round(f.totalCredits / summary.totalCredits * 100) : 0;
                      return (
                        <div key={f._id}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{f.featureLabel}</span>
                            <span className="text-sm font-bold text-indigo-600">{f.totalCredits} <span className="text-gray-400 font-normal text-xs">({f.totalCalls} calls)</span></span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {summary.byFeature.length === 0 && <p className="text-sm text-gray-400">No usage this month</p>}
                  </div>
                </div>

                {/* By User */}
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-blue-500" /> Credits by User / Company</h3>
                  <div className="space-y-2 max-h-[350px] overflow-y-auto">
                    {summary.byUser.map(u => (
                      <div key={u._id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => setSelectedUser(u._id)}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{u.businessName || u.userName}</p>
                          <p className="text-xs text-gray-500 truncate">{u.userEmail} · {u.plan}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-indigo-600">{u.totalCredits}</p>
                          <p className="text-xs text-gray-400">{u.totalCalls} calls</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={(e) => { e.stopPropagation(); setSelectedUser(u._id); }}
                            className="p-1.5 text-gray-400 hover:text-indigo-600"><Eye className="w-3.5 h-3.5" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleSendReport(u._id); }} disabled={sending === u._id}
                            className="p-1.5 text-gray-400 hover:text-green-600 disabled:opacity-50">
                            {sending === u._id ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    ))}
                    {summary.byUser.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No usage this month</p>}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── ALL LOGS VIEW ── */}
      {view === 'logs' && !selectedUser && (
        <div>
          {/* Filters */}
          <div className="bg-white rounded-xl border p-4 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">Filters</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Company / Business</label>
                <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2">
                  <Search className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                  <input value={filterBusiness} onChange={e => setFilterBusiness(e.target.value)}
                    placeholder="Search..." className="flex-1 text-sm outline-none bg-transparent" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Feature</label>
                <select value={filterFeature} onChange={e => setFilterFeature(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
                  <option value="">All Features</option>
                  {featureOptions.map(f => <option key={f.value} value={f.value}>{f.label} ({f.cost} cr)</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">From Date</label>
                <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">To Date</label>
                <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => loadLogs(1)}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 flex items-center gap-1">
                <Search className="w-3.5 h-3.5" /> Search
              </button>
              <button onClick={() => { setFilterFeature(''); setFilterBusiness(''); setFilterDateFrom(''); setFilterDateTo(''); }}
                className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Clear
              </button>
              <button onClick={handleDownloadPDF}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 flex items-center gap-1 ml-auto">
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader className="w-8 h-8 animate-spin text-indigo-500" /></div>
          ) : (
            <>
              <div className="text-xs text-gray-400 mb-2">{logsTotal} records found · Page {logsPage} of {logsPages}</div>
              <div className="bg-white rounded-xl border overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                      <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Date & Time</th>
                      <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                      <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Company</th>
                      <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Feature</th>
                      <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Model</th>
                      <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Opportunity</th>
                      <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Plan</th>
                      <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Credits</th>
                      <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Remaining</th>
                      <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, i) => {
                      const d = new Date(log.createdAt);
                      return (
                        <tr key={log._id} className={`border-t border-gray-100 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                          <td className="px-3 py-3 text-gray-400 text-xs">{(logsPage - 1) * 30 + i + 1}</td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <p className="text-sm">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                            <p className="text-xs text-gray-400">{d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                          </td>
                          <td className="px-3 py-3">
                            <p className="text-sm font-medium truncate max-w-[120px]">{log.userName}</p>
                            <p className="text-xs text-gray-400 truncate max-w-[120px]">{log.userEmail}</p>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 max-w-[120px] truncate">{log.businessName || '—'}</td>
                          <td className="px-3 py-3 text-sm font-medium">{log.featureLabel}</td>
                          <td className="px-3 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_COLORS[log.model] || 'bg-gray-100 text-gray-600'}`}>{(log.model || '').replace('Claude ', '')}</span></td>
                          <td className="px-3 py-3 text-xs text-gray-500 max-w-[180px] truncate">{log.opportunityTitle || '—'}</td>
                          <td className="px-3 py-3"><span className="text-xs capitalize bg-gray-100 px-2 py-0.5 rounded-full">{log.plan}</span></td>
                          <td className="px-3 py-3 text-center font-bold text-indigo-600">{log.creditsUsed}</td>
                          <td className="px-3 py-3 text-center text-gray-400">{log.creditsRemaining}</td>
                          <td className="px-3 py-3">
                            <button onClick={() => setSelectedUser(log.user)} className="p-1 text-gray-400 hover:text-indigo-600" title="View user history">
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {logs.length === 0 && (
                  <div className="text-center py-12 text-gray-400"><Coins className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>No usage logs found</p></div>
                )}
              </div>

              {/* Pagination */}
              {logsPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button onClick={() => loadLogs(logsPage - 1)} disabled={logsPage <= 1}
                    className="p-2 rounded-lg bg-white border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-600">Page {logsPage} of {logsPages}</span>
                  <button onClick={() => loadLogs(logsPage + 1)} disabled={logsPage >= logsPages}
                    className="p-2 rounded-lg bg-white border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
