import { useState } from 'react';
import { BarChart3, Sparkles, Loader2, Lock, Copy, CheckCircle, Download, RefreshCw } from 'lucide-react';
import { aiAPI } from '../services/api';
import { useUserPlan } from '../hooks/useUserPlan';
import { usePlans } from '../hooks/usePlans';
import jsPDF from 'jspdf';

export default function MarketResearch() {
  const { plan: userPlan, loading: planLoading } = useUserPlan();
  const { getMonthly, getYearly } = usePlans();
  const isEnterprise = userPlan === 'enterprise';

  const [report,  setReport]  = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [copied,  setCopied]  = useState(false);

  const generate = async () => {
    setLoading(true); setError(''); setReport('');
    try {
      const res = await aiAPI.marketResearch();
      setReport(res.data.data.report);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePDF = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const margin = 18; const pageW = doc.internal.pageSize.getWidth(); const maxW = pageW - margin * 2;
    doc.setFillColor(79, 70, 229); doc.rect(0, 0, pageW, 22, 'F');
    doc.setFontSize(13); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
    doc.text('Federal Market Research Report', margin, 14);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text(`Sambid Notify — ${new Date().toLocaleDateString()}`, pageW - margin, 14, { align: 'right' });
    doc.setTextColor(30, 30, 30); doc.setFontSize(9);
    const lines = doc.splitTextToSize(report, maxW);
    let y = 30;
    lines.forEach(line => { if (y > 275) { doc.addPage(); y = 18; } doc.text(line, margin, y); y += 5; });
    doc.save(`market-research-${new Date().toISOString().slice(0,10)}.pdf`);
  };

  if (planLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
    </div>
  );

  if (!isEnterprise) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border p-10 max-w-md text-center">
        <Lock className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Enterprise Feature</h2>
        <p className="text-gray-500 mb-5">
          AI Market Research Reports are available on the Enterprise plan
          {getMonthly('enterprise') != null && getYearly('enterprise') != null
            ? ` ($${getMonthly('enterprise')}/mo or $${getYearly('enterprise')}/yr)` : ''}.
        </p>
        <a href="/contact" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition inline-block">Request Enterprise</a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Market Research Report</h1>
              <p className="text-gray-500 text-sm">AI-generated intelligence report tailored to your NAICS codes.</p>
            </div>
          </div>
          <button onClick={generate} disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition disabled:opacity-60">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate Report</>}
          </button>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Agency Spend Analysis', icon: '🏛️' },
            { label: 'Competitive Landscape', icon: '🎯' },
            { label: 'Market Trends', icon: '📈' },
            { label: 'Action Items', icon: '✅' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-2xl mb-1">{c.icon}</div>
              <p className="text-xs font-medium text-gray-600">{c.label}</p>
            </div>
          ))}
        </div>

        {loading && (
          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-8 text-center mb-6">
            <Loader2 className="w-10 h-10 animate-spin text-purple-600 mx-auto mb-3" />
            <p className="font-semibold text-purple-800">Generating your market intelligence report...</p>
            <p className="text-sm text-purple-600 mt-1">Analyzing federal spend data and market trends for your NAICS codes. This takes 20–40 seconds.</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">{error}</div>
        )}

        {report && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-500" />
                Market Intelligence Report — {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </h3>
              <div className="flex gap-2">
                <button onClick={generate} title="Regenerate" className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button onClick={handleCopy} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                  {copied ? <><CheckCircle className="w-3.5 h-3.5 text-green-500" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                </button>
                <button onClick={handlePDF} className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
              </div>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-5 border border-gray-100 max-h-[700px] overflow-y-auto">
              {report}
            </pre>
          </div>
        )}

        {!report && !loading && (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
            <BarChart3 className="w-14 h-14 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Your market research report will appear here</p>
            <p className="text-gray-300 text-sm mt-1">Click "Generate Report" to create an AI-powered market intelligence briefing for your NAICS codes.</p>
          </div>
        )}
      </div>
    </div>
  );
}
