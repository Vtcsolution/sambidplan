import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Loader2, Lock, Sparkles, AlertCircle } from 'lucide-react';
import { aiAPI } from '../services/api';
import { useUserPlan } from '../hooks/useUserPlan';
import { AICreditsBar } from '../components/AICreditsBar';

const SET_ASIDES = ['Full & Open', 'Small Business', '8(a)', 'WOSB', 'HUBZone', 'SDVOSB', 'VOSB'];
const CAPACITY   = ['Fully Available', 'Partially Available', 'Stretched', 'Not Available'];
const PP_MATCH   = ['Strong (3+ examples)', 'Moderate (1-2 examples)', 'Weak (adjacent only)', 'None'];

function ScoreBar({ label, score }) {
  const pct = (score / 10) * 100;
  const color = score >= 7 ? 'bg-green-500' : score >= 4 ? 'bg-yellow-500' : 'bg-red-400';
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-36 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-700 w-8 text-right">{score}/10</span>
    </div>
  );
}

export default function GoNoGo() {
  const { plan: userPlan, loading: planLoading } = useUserPlan();
  const isPro = ['pro', 'enterprise'].includes(userPlan);

  const [form, setForm] = useState({
    opportunityTitle:   '',
    agency:             '',
    naicsCode:          '',
    setAside:           'Full & Open',
    estimatedValue:     '',
    dueDate:            '',
    competitorCount:    '',
    pastPerformanceMatch: 'Moderate (1-2 examples)',
    teamCapacity:       'Fully Available',
    notes:              '',
  });
  const [result,  setResult]  = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Parse decision from AI result
  const decision = result.includes('NO-GO') ? 'NO-GO' : result.includes('CONDITIONAL GO') ? 'CONDITIONAL' : result.includes('GO') ? 'GO' : '';

  const handleAnalyze = async () => {
    if (!form.opportunityTitle.trim()) { setError('Opportunity title is required.'); return; }
    setLoading(true); setError(''); setResult('');
    try {
      const res = await aiAPI.goNoGo(form);
      setResult(res.data.data.analysis);
    } catch (err) {
      setError(err.response?.data?.message || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (planLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
    </div>
  );

  if (!isPro) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border p-10 max-w-md text-center">
        <Lock className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Pro Feature</h2>
        <p className="text-gray-500 mb-5">Go/No-Go Workflow requires Pro or Enterprise plan.</p>
        <a href="/pricing" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition inline-block">Upgrade Now</a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
        <AICreditsBar feature="go_no_go" />
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
            <ThumbsUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Go/No-Go Decision Workflow</h1>
            <p className="text-gray-500 text-sm">Structured AI-powered bid decision with scoring matrix and win strategy.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 text-sm">Opportunity Details</h3>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Opportunity Title *</label>
                <input value={form.opportunityTitle} onChange={e => setForm(f => ({...f, opportunityTitle: e.target.value}))}
                  placeholder="e.g. IT Support Services for DHS Headquarters"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Agency</label>
                  <input value={form.agency} onChange={e => setForm(f => ({...f, agency: e.target.value}))}
                    placeholder="e.g. DHS, DoD, VA"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">NAICS Code</label>
                  <input value={form.naicsCode} onChange={e => setForm(f => ({...f, naicsCode: e.target.value}))}
                    placeholder="e.g. 541512"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Set-Aside</label>
                  <select value={form.setAside} onChange={e => setForm(f => ({...f, setAside: e.target.value}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white">
                    {SET_ASIDES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Est. Value ($)</label>
                  <input value={form.estimatedValue} onChange={e => setForm(f => ({...f, estimatedValue: e.target.value}))}
                    placeholder="e.g. 2,500,000"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Proposal Due Date</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm(f => ({...f, dueDate: e.target.value}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Likely Competitors</label>
                  <input value={form.competitorCount} onChange={e => setForm(f => ({...f, competitorCount: e.target.value}))}
                    placeholder="e.g. 5-10"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 text-sm">Company Readiness</h3>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Past Performance Match</label>
                <select value={form.pastPerformanceMatch} onChange={e => setForm(f => ({...f, pastPerformanceMatch: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white">
                  {PP_MATCH.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Team Capacity</label>
                <select value={form.teamCapacity} onChange={e => setForm(f => ({...f, teamCapacity: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white">
                  {CAPACITY.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Additional Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={3}
                  placeholder="Incumbent status, teaming arrangements, special requirements..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
              </div>
            </div>

            {error && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

            <button onClick={handleAnalyze} disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-60">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : <><Sparkles className="w-4 h-4" /> Run Go/No-Go Analysis</>}
            </button>
          </div>

          {/* Result */}
          <div>
            {result ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4 sticky top-6">
                {/* Decision Badge */}
                <div className={`flex items-center gap-3 p-4 rounded-xl ${
                  decision === 'GO' ? 'bg-green-50 border border-green-200' :
                  decision === 'NO-GO' ? 'bg-red-50 border border-red-200' :
                  'bg-yellow-50 border border-yellow-200'}`}>
                  {decision === 'GO'
                    ? <ThumbsUp className="w-8 h-8 text-green-600" />
                    : decision === 'NO-GO'
                    ? <ThumbsDown className="w-8 h-8 text-red-500" />
                    : <AlertCircle className="w-8 h-8 text-yellow-600" />}
                  <div>
                    <p className={`text-xl font-black ${decision === 'GO' ? 'text-green-700' : decision === 'NO-GO' ? 'text-red-600' : 'text-yellow-700'}`}>
                      {decision || 'ANALYSIS'}
                    </p>
                    <p className="text-xs text-gray-500">AI-powered bid decision</p>
                  </div>
                </div>

                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-4 max-h-[500px] overflow-y-auto border border-gray-100">{result}</pre>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 flex flex-col items-center justify-center min-h-[400px] text-center">
                <ThumbsUp className="w-12 h-12 text-gray-200 mb-3" />
                <p className="text-gray-400 font-medium">Decision analysis will appear here</p>
                <p className="text-gray-300 text-sm mt-1">Fill the form and run analysis</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
