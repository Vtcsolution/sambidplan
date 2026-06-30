import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, Loader2, Lock, Sparkles, AlertCircle, Search, FileText, Clock, DollarSign, Building, ChevronDown, Database, CheckCircle } from 'lucide-react';
import { aiAPI, opportunityAPI, savedAPI } from '../services/api';
import HowItWorks from '../components/HowItWorks';
import { useUserPlan } from '../hooks/useUserPlan';
import AIResponseRenderer from '../components/AIResponseRenderer';
import { AICreditsBar } from '../components/AICreditsBar';

const CAPACITY = ['Fully Available', 'Partially Available', 'Stretched', 'Not Available'];

function ScoreBar({ label, score }) {
  const pct = (score / 10) * 100;
  const color = score >= 7 ? 'bg-green-500' : score >= 4 ? 'bg-yellow-500' : 'bg-red-400';
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-40 shrink-0">{label}</span>
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-700 w-8 text-right">{score}/10</span>
    </div>
  );
}

export default function GoNoGo() {
  const { plan: userPlan, loading: planLoading } = useUserPlan();
  const isPro = ['pro', 'enterprise'].includes(userPlan);

  const [opportunities, setOpportunities] = useState([]);
  const [savedOpps, setSavedOpps] = useState([]);
  const [loadingOpps, setLoadingOpps] = useState(true);
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSelector, setShowSelector] = useState(false);
  const [source, setSource] = useState('saved');

  const [teamCapacity, setTeamCapacity] = useState('Fully Available');
  const [notes, setNotes] = useState('');

  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isPro) loadOpportunities();
  }, [isPro]);

  const loadOpportunities = async () => {
    setLoadingOpps(true);
    try {
      const [savedRes, feedRes] = await Promise.all([
        savedAPI.getAll().catch(() => ({ data: { data: [] } })),
        opportunityAPI.getAll({ limit: 50 }).catch(() => ({ data: { data: [] } })),
      ]);
      setSavedOpps((savedRes.data.data || []).filter(s => s.opportunity).map(s => ({
        ...s.opportunity,
        _savedStatus: s.status,
        _savedId: s._id,
      })));
      setOpportunities(feedRes.data.data || []);
    } catch {}
    setLoadingOpps(false);
  };

  const decision = result.includes('NO-GO') ? 'NO-GO' : result.includes('CONDITIONAL') ? 'CONDITIONAL' : result.includes('GO') ? 'GO' : '';

  const handleAnalyze = async () => {
    if (!selectedOpp) { setError('Please select an opportunity first.'); return; }
    setLoading(true); setError(''); setResult('');
    try {
      const res = await aiAPI.goNoGo({
        opportunityId: selectedOpp._id,
        teamCapacity,
        notes,
      });
      setResult(res.data.data.analysis);
    } catch (err) {
      setError(err.response?.data?.message || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const displayList = source === 'saved' ? savedOpps : opportunities;
  const filtered = searchTerm.trim()
    ? displayList.filter(o => o.title?.toLowerCase().includes(searchTerm.toLowerCase()) || o.agency?.toLowerCase().includes(searchTerm.toLowerCase()) || o.sourceId?.toLowerCase().includes(searchTerm.toLowerCase()))
    : displayList;

  if (planLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

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
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
        <AICreditsBar feature="go_no_go" />
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
            <ThumbsUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">Go/No-Go Decision Workflow</h1>
              <HowItWorks
                title="Go/No-Go Decision"
                steps={[
                  { title: 'Select an opportunity', description: 'Choose from your saved opportunities or feed — all contract data is loaded automatically' },
                  { title: 'AI fetches real data', description: 'Pulls competitors from USASpending, your company profile (UEI, certs, past wins), and full SOW text' },
                  { title: '10-factor scoring matrix', description: 'Each factor scored 1-10 with evidence: NAICS match, set-aside, past performance, competition, pricing, timeline, capacity, agency relationship' },
                  { title: 'GO / NO-GO / CONDITIONAL', description: 'Clear recommendation with win probability, pricing intelligence, action plan with deadlines, and alternatives if NO-GO' },
                ]}
                dataUsed={['SAM.gov (full SOW)', 'USASpending (competitors)', 'Your Company Profile', 'Your Past Wins']}
              >
                <p className="text-sm font-semibold text-gray-700 mt-2">Connected to:</p>
                <ul className="text-xs text-gray-500 list-disc list-inside space-y-0.5 mt-1">
                  <li><strong>Saved Opportunities</strong> → select from "My Saved" tab for instant analysis</li>
                  <li><strong>Opportunities Feed</strong> → or select from "My Feed" tab</li>
                  <li><strong>Past Performance</strong> → your stored contracts improve the scoring accuracy</li>
                  <li><strong>Company Profile</strong> → UEI, certifications, business type affect set-aside scoring</li>
                  <li><strong>Winning Bids</strong> → same USASpending data used to identify competitors and pricing</li>
                  <li>If GO → use <strong>Proposal Builder</strong> to write the proposal</li>
                  <li>If NO-GO → check <strong>Teaming Finder</strong> for partnership options</li>
                </ul>
              </HowItWorks>
            </div>
            <p className="text-gray-500 text-sm">Select an opportunity — AI analyzes with real competitor data, pricing history, and your company profile.</p>
          </div>
        </div>

        {/* Data sources indicator */}
        <div className="mb-6 p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-start gap-3">
          <Database className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
          <div className="text-sm text-indigo-700">
            <strong>AI analyzes 4 real data sources:</strong> Complete SAM.gov opportunity data (full SOW/description) + Historical winners from USASpending.gov + Your verified company profile (UEI, certs, past wins) + Real market pricing benchmarks
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Opportunity Selection */}
          <div className="space-y-4">
            {/* Step 1: Select Opportunity */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                Select Opportunity
              </h3>

              {selectedOpp ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{selectedOpp.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{selectedOpp.agency}</p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs">
                        {selectedOpp.sourceId && <span className="font-mono bg-white px-2 py-0.5 rounded border">{selectedOpp.sourceId}</span>}
                        {selectedOpp.naicsCode && <span>NAICS: {selectedOpp.naicsCode}</span>}
                        {selectedOpp.estimatedValue && <span className="text-green-700 font-semibold">${selectedOpp.estimatedValue.toLocaleString()}</span>}
                        {selectedOpp.dueDate && <span className="text-orange-600">Due: {new Date(selectedOpp.dueDate).toLocaleDateString()}</span>}
                        {selectedOpp.setAside && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{selectedOpp.setAside}</span>}
                        {selectedOpp.noticeType && <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">{selectedOpp.noticeType}</span>}
                      </div>
                    </div>
                    <button onClick={() => { setSelectedOpp(null); setResult(''); }} className="text-xs text-red-500 hover:underline shrink-0 ml-2">Change</button>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-green-700">
                    <CheckCircle className="w-3.5 h-3.5" /> Full opportunity data will be sent to AI — description, contacts, dates, attachments
                  </div>
                </div>
              ) : (
                <div>
                  {/* Source tabs */}
                  <div className="flex gap-2 mb-3">
                    <button onClick={() => setSource('saved')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${source === 'saved' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      My Saved ({savedOpps.length})
                    </button>
                    <button onClick={() => setSource('feed')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${source === 'feed' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      My Feed ({opportunities.length})
                    </button>
                  </div>

                  {/* Search */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      placeholder="Search by title, agency, solicitation #..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-400 focus:outline-none"
                    />
                  </div>

                  {/* Opportunity list */}
                  <div className="max-h-64 overflow-y-auto space-y-1.5 border rounded-xl p-2 bg-gray-50">
                    {loadingOpps ? (
                      <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
                    ) : filtered.length === 0 ? (
                      <p className="text-center text-gray-400 text-xs py-6">{source === 'saved' ? 'No saved opportunities. Save some from Opportunities page first.' : 'No opportunities in your feed.'}</p>
                    ) : filtered.map(opp => (
                      <button
                        key={opp._id}
                        onClick={() => setSelectedOpp(opp)}
                        className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                      >
                        <p className="text-sm font-semibold text-gray-900 truncate">{opp.title}</p>
                        <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Building className="w-3 h-3" />{(opp.agency || '').substring(0, 30)}</span>
                          {opp.estimatedValue && <span className="text-green-700 font-medium">${opp.estimatedValue.toLocaleString()}</span>}
                          {opp.dueDate && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(opp.dueDate).toLocaleDateString()}</span>}
                          {opp.naicsCode && <span className="font-mono">{opp.naicsCode}</span>}
                          {opp._savedStatus && <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded capitalize">{opp._savedStatus}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Company Readiness */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                Company Readiness
              </h3>
              <p className="text-xs text-gray-400">Your company profile, past wins, and certifications are auto-loaded from your verified account. Just confirm your team capacity below.</p>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Team Capacity</label>
                <select value={teamCapacity} onChange={e => setTeamCapacity(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white">
                  {CAPACITY.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Additional Context (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  placeholder="Teaming plans, incumbent intel, special requirements, why you're interested in this contract..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
              </div>
            </div>

            {error && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

            {/* Step 3: Run */}
            <button onClick={handleAnalyze} disabled={loading || !selectedOpp}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-60">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing with Real Data...</> : <><Sparkles className="w-4 h-4" /> Run Go/No-Go Analysis</>}
            </button>
            {loading && (
              <p className="text-xs text-gray-400 text-center">Fetching competitor data from USASpending.gov + your company profile + full opportunity data...</p>
            )}
          </div>

          {/* Right: Result */}
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
                    <p className="text-xs text-gray-500">Based on real SAM.gov + USASpending data</p>
                  </div>
                </div>

                {/* Data sources used */}
                <div className="flex flex-wrap gap-1.5">
                  {['SAM.gov Data', 'USASpending Competitors', 'Company Profile', 'Past Wins'].map(s => (
                    <span key={s} className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <CheckCircle className="w-2.5 h-2.5" />{s}
                    </span>
                  ))}
                </div>

                <div className="bg-gray-50 rounded-xl p-4 max-h-[600px] overflow-y-auto border border-gray-100"><AIResponseRenderer content={result} /></div>

                <button onClick={() => { navigator.clipboard.writeText(result); }} className="w-full py-2 text-sm text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 font-medium">
                  Copy Analysis to Clipboard
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 flex flex-col items-center justify-center min-h-[500px] text-center sticky top-6">
                <ThumbsUp className="w-14 h-14 text-gray-200 mb-4" />
                <p className="text-gray-400 font-medium text-lg">Gate Review Results</p>
                <p className="text-gray-300 text-sm mt-2 max-w-xs">Select an opportunity from your saved list or feed, then run the analysis. AI will fetch real competitor data and score every factor with evidence.</p>
                <div className="mt-6 grid grid-cols-2 gap-2 text-xs text-gray-400 max-w-xs">
                  <div className="bg-gray-50 rounded-lg p-2.5">10-factor scoring matrix</div>
                  <div className="bg-gray-50 rounded-lg p-2.5">Real competitor names</div>
                  <div className="bg-gray-50 rounded-lg p-2.5">Pricing intelligence</div>
                  <div className="bg-gray-50 rounded-lg p-2.5">Win strategy + action plan</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
