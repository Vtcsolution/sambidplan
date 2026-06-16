import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain, RefreshCw, TrendingUp, Target, AlertTriangle,
  CheckCircle, Zap, BarChart3, ChevronDown, ChevronUp,
  ExternalLink, Clock, Lightbulb, Users, Shield, Star,
  Sparkles, ArrowRight, CalendarDays, DollarSign, Loader2
} from 'lucide-react';
import { predictionAPI } from '../services/api';
import { useUserPlan } from '../hooks/useUserPlan';
import { AICreditsBar } from '../components/AICreditsBar';
import PlanGate from '../components/PlanGate';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtVal = (v) => {
  if (!v) return null;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v}`;
};

// ── Win-probability ring ──────────────────────────────────────────────────────
const WinRing = ({ pct }) => {
  const color = pct >= 70 ? '#22c55e' : pct >= 45 ? '#f59e0b' : '#ef4444';
  const r = 22, circ = 2 * Math.PI * r, fill = (pct / 100) * circ;
  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={r} fill="none" stroke="#e5e7eb" strokeWidth="5" />
        <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold leading-none" style={{ color }}>{pct}%</span>
        <span className="text-[9px] text-gray-400 leading-none mt-0.5">win</span>
      </div>
    </div>
  );
};

// ── Recommendation badge ──────────────────────────────────────────────────────
const RecBadge = ({ rec }) => {
  const styles = {
    'STRONG GO':   'bg-green-100 text-green-700 border-green-200',
    'GO':          'bg-blue-100 text-blue-700 border-blue-200',
    'CONDITIONAL': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'PASS':        'bg-red-100 text-red-700 border-red-200',
  };
  const icons = {
    'STRONG GO':   <CheckCircle className="w-3.5 h-3.5" />,
    'GO':          <Zap className="w-3.5 h-3.5" />,
    'CONDITIONAL': <AlertTriangle className="w-3.5 h-3.5" />,
    'PASS':        <AlertTriangle className="w-3.5 h-3.5" />,
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[rec] || styles['GO']}`}>
      {icons[rec]} {rec}
    </span>
  );
};

// ── Full prediction card ──────────────────────────────────────────────────────
const PredictionCard = ({ pred, index }) => {
  const [expanded, setExpanded] = useState(index < 2);
  const daysLeft = pred.dueDate
    ? Math.ceil((new Date(pred.dueDate) - Date.now()) / 86400000)
    : null;

  const urgencyColor =
    pred.urgencyLevel === 'Critical' ? 'text-red-600 bg-red-50 border-red-200' :
    pred.urgencyLevel === 'High'     ? 'text-orange-600 bg-orange-50 border-orange-200' :
    pred.urgencyLevel === 'Medium'   ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
                                       'text-green-600 bg-green-50 border-green-200';

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow min-w-0">
      {/* Card header */}
      <div
        className="flex items-center gap-3 p-4 sm:p-5 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <WinRing pct={pred.winProbability} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
            <RecBadge rec={pred.recommendation} />
            <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded whitespace-nowrap">
              {pred.naicsCode}
            </span>
            {daysLeft !== null && daysLeft <= 14 && (
              <span className="text-xs text-red-600 font-semibold flex items-center gap-1 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                <Clock className="w-3 h-3" />{daysLeft}d left
              </span>
            )}
          </div>
          <p className="text-sm sm:text-base font-semibold text-gray-900 line-clamp-2">{pred.title}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
            <span className="truncate max-w-[160px] sm:max-w-none">{pred.agency}</span>
            {pred.estimatedValue > 0 && (
              <span className="flex items-center gap-1 text-green-600 font-medium whitespace-nowrap">
                <DollarSign className="w-3 h-3" />{fmtVal(pred.estimatedValue)}
              </span>
            )}
            {pred.dueDate && (
              <span className="flex items-center gap-1 whitespace-nowrap">
                <CalendarDays className="w-3 h-3" />
                {new Date(pred.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-gray-400">
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
          {/* Fit score */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-20 shrink-0">Fit Score</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full bg-indigo-500 transition-all"
                style={{ width: `${(pred.fitScore / 10) * 100}%` }}
              />
            </div>
            <span className="text-sm font-bold text-indigo-600 w-10 text-right">{pred.fitScore}/10</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Why you fit */}
            {pred.topReasons?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Why You Fit</p>
                <ul className="space-y-1.5">
                  {pred.topReasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                      <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-green-500" />{r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risks */}
            {pred.risks?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Watch Out For</p>
                <ul className="space-y-1.5">
                  {pred.risks.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />{r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {pred.uniqueAdvantage && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5" /> Your Advantage
                </p>
                <p className="text-xs text-amber-600">{pred.uniqueAdvantage}</p>
              </div>
            )}
            {pred.bidStrategy && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-indigo-700 mb-1 flex items-center gap-1">
                  <Lightbulb className="w-3.5 h-3.5" /> Bid Strategy
                </p>
                <p className="text-xs text-indigo-600">{pred.bidStrategy}</p>
              </div>
            )}
            {pred.nextAction && (
              <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-green-700 mb-1 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" /> Do This Now
                </p>
                <p className="text-xs text-green-600">{pred.nextAction}</p>
              </div>
            )}
          </div>

          {/* Bottom row */}
          <div className="flex items-center justify-between flex-wrap gap-3 pt-1 border-t border-gray-100">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-1 rounded-full font-medium border ${urgencyColor}`}>
                <Clock className="w-3 h-3 inline mr-1" />Urgency: {pred.urgencyLevel}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                pred.confidenceLevel === 'High'   ? 'bg-green-100 text-green-700' :
                pred.confidenceLevel === 'Medium' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                <Shield className="w-3 h-3 inline mr-1" />Confidence: {pred.confidenceLevel}
              </span>
              {pred.teamingAdvice && pred.teamingAdvice !== 'Solo bid' && (
                <span className="text-xs px-2 py-1 rounded-full font-medium bg-purple-100 text-purple-700">
                  <Users className="w-3 h-3 inline mr-1" />{pred.teamingAdvice}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {pred.url && pred.url !== '#' && (
                <a href={pred.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                  <ExternalLink className="w-4 h-4" /> SAM.gov
                </a>
              )}
              <Link to={`/opportunity/${pred.opportunityId}`}
                className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 font-medium transition-colors">
                <ArrowRight className="w-4 h-4" /> Full Details
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Market intelligence panel ─────────────────────────────────────────────────
const MarketPanel = ({ insights }) => {
  if (!insights) return null;

  const outlookColors = {
    Positive: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-700' },
    Neutral:  { bg: 'bg-gray-50 border-gray-200',   text: 'text-gray-600',  badge: 'bg-gray-100 text-gray-600'  },
    Cautious: { bg: 'bg-amber-50 border-amber-200',  text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  };
  const oc = outlookColors[insights.marketOutlook] || outlookColors.Neutral;

  return (
    <div className="space-y-4">
      {/* Outlook banner */}
      <div className={`border rounded-2xl p-5 ${oc.bg}`}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" /> Market Intelligence
          </p>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${oc.badge}`}>
            {insights.marketOutlook} Outlook
          </span>
        </div>
        {insights.outlookReason && (
          <p className="text-sm text-gray-500 italic mb-3">{insights.outlookReason}</p>
        )}
        <p className="text-sm text-gray-700 leading-relaxed">{insights.weeklyAdvice}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Contracts',   value: insights.totalOpportunities, color: 'text-indigo-600' },
          { label: 'Avg Contract Value', value: `$${(insights.avgContractValue || 0).toLocaleString()}`, color: 'text-green-600' },
          { label: 'Competition Level',  value: insights.competitionLevel, color: insights.competitionLevel === 'Low' ? 'text-green-600' : insights.competitionLevel === 'High' ? 'text-red-600' : 'text-amber-600' },
          { label: 'Best Months',        value: insights.bestMonthsToSubmit?.join(', ') || '—', color: 'text-blue-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Agencies + Sectors grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.hotAgencies?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">🔥 Hot Agencies</p>
            <ul className="space-y-1.5">
              {insights.hotAgencies.slice(0, 5).map((a, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${i < 2 ? 'bg-red-400' : 'bg-orange-300'}`} />
                  {a}
                </li>
              ))}
            </ul>
            {insights.hiddenGemAgencies?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 mb-1.5">💎 Hidden Gems (less competition)</p>
                {insights.hiddenGemAgencies.map((a, i) => (
                  <p key={i} className="text-sm text-indigo-600">{a}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {insights.trendingSectors?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">📈 Trending Work Types</p>
            <ul className="space-y-2">
              {insights.trendingSectors.slice(0, 4).map((s, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <TrendingUp className="w-3.5 h-3.5 text-green-500 shrink-0" />{s}
                </li>
              ))}
            </ul>
            {insights.setAsideOpportunity && (
              <div className="mt-3 pt-3 border-t border-gray-100 bg-indigo-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-indigo-700 mb-1">Set-Aside Strategy</p>
                <p className="text-xs text-indigo-600">{insights.setAsideOpportunity}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Top strategy */}
      {insights.topWinningStrategy && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm font-bold text-green-800 flex items-center gap-2 mb-1.5">
            <Star className="w-4 h-4" /> #1 Win Strategy for Your Business
          </p>
          <p className="text-sm text-green-700">{insights.topWinningStrategy}</p>
        </div>
      )}

      {/* Budget cycle */}
      {insights.budgetYearInsight && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3">
          <CalendarDays className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-0.5">Federal Budget Cycle</p>
            <p className="text-sm text-gray-600">{insights.budgetYearInsight}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AIPredictions() {
  const { plan: userPlan } = useUserPlan();
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(null);
  const [tab,        setTab]        = useState('predictions'); // 'predictions' | 'market'
  const [showAll,    setShowAll]    = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await predictionAPI.getDashboard(refresh);
      setData(res.data.data);
    } catch (e) {
      const msg = e.response?.data?.message || 'AI predictions temporarily unavailable.';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!['pro', 'enterprise'].includes(userPlan)) {
    return (
      <PlanGate
        requiredPlan="pro"
        featureName="AI Contract Predictions"
        description="Get personalized win-probability analysis, bid strategy, and market intelligence powered by AI — tailored to your NAICS codes and business profile. Available on Pro and Enterprise plans."
      />
    );
  }

  const predictions = data?.predictions || [];
  const visible = showAll ? predictions : predictions.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2.5">
              <Brain className="w-7 h-7 text-indigo-600 shrink-0" />
              AI Contract Predictions
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              Personalized win-probability analysis for your federal contracts.
            </p>
          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Analyzing…' : 'Refresh'}
          </button>
        </div>

        {/* AI Credits bar */}
        {!loading && !error && <AICreditsBar feature="ai_predictions" />}

        {/* Cache notice */}
        {data?.fromCache && !loading && (
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-4 bg-white border border-gray-100 rounded-xl px-4 py-2.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Analysis from {new Date(data.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} —
            refreshes every 4 hours
            <span className="ml-auto text-indigo-500 font-medium">
              NAICS: {data.userProfile?.naicsCodes?.join(', ')}
            </span>
          </div>
        )}

        {/* AI unavailable banner — shows when basic scoring is used */}
        {!loading && !error && data?.marketInsights?.outlookReason?.includes('AI narrative unavailable') && (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
            <span>
              <strong>Basic scoring mode</strong> — AI analysis is unavailable (check OpenAI API key in admin settings).
              Predictions shown are based on data signals only, not AI analysis.
            </span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1">
          {[
            { id: 'predictions', label: 'Opportunity Predictions', short: 'Predictions', icon: Target },
            { id: 'market',      label: 'Market Intelligence',     short: 'Market',      icon: BarChart3 },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <t.icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.short}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="relative">
              <Brain className="w-16 h-16 text-indigo-200" />
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-500 rounded-full animate-pulse flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-gray-700">AI is analyzing your opportunities</p>
              <p className="text-sm text-gray-400 mt-1">Calculating win probabilities based on your business profile…</p>
            </div>
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
            <p className="text-gray-700 font-medium mb-1">{error}</p>
            <p className="text-sm text-gray-400 mb-4">
              {error.includes('Pro plan')
                ? 'Upgrade to Pro or Enterprise to unlock AI predictions.'
                : 'The AI service may be temporarily busy. Please try again.'}
            </p>
            {!error.includes('Pro plan') && (
              <button onClick={() => load()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                Retry
              </button>
            )}
            {error.includes('Pro plan') && (
              <Link to="/pricing" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 inline-block">
                Upgrade Plan
              </Link>
            )}
          </div>
        ) : tab === 'predictions' ? (
          <div className="space-y-4">
            {/* Summary bar */}
            {predictions.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {
                    label: 'Analyzed',
                    value: predictions.length,
                    color: 'text-indigo-600',
                    sub: 'opportunities',
                  },
                  {
                    label: 'Strong Go',
                    value: predictions.filter(p => p.recommendation === 'STRONG GO').length,
                    color: 'text-green-600',
                    sub: 'top picks',
                  },
                  {
                    label: 'Avg Win Probability',
                    value: `${Math.round(predictions.reduce((s, p) => s + p.winProbability, 0) / predictions.length)}%`,
                    color: 'text-amber-600',
                    sub: 'across all',
                  },
                  {
                    label: 'Urgent',
                    value: predictions.filter(p => ['Critical','High'].includes(p.urgencyLevel)).length,
                    color: 'text-red-600',
                    sub: 'act now',
                  },
                ].map((s, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs font-semibold text-gray-700 mt-0.5">{s.label}</p>
                    <p className="text-xs text-gray-400">{s.sub}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Prediction cards */}
            {visible.length > 0 ? (
              <>
                {visible.map((pred, i) => (
                  <PredictionCard key={pred.opportunityId} pred={pred} index={i} />
                ))}
                {predictions.length > 5 && (
                  <button
                    onClick={() => setShowAll(s => !s)}
                    className="w-full py-3 text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-white border border-gray-200 rounded-xl flex items-center justify-center gap-1.5 hover:bg-indigo-50 transition-colors"
                  >
                    {showAll
                      ? <><ChevronUp className="w-4 h-4" /> Show less</>
                      : <><ChevronDown className="w-4 h-4" /> Show {predictions.length - 5} more predictions</>
                    }
                  </button>
                )}
              </>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
                <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium mb-1">No opportunities to analyze yet.</p>
                <p className="text-sm text-gray-400 mb-4">
                  Add NAICS codes in your profile settings, then browse contracts to build your feed.
                </p>
                <div className="flex justify-center gap-3">
                  <Link to="/settings" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                    Add NAICS Codes
                  </Link>
                  <Link to="/opportunities" className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
                    Browse Contracts
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : (
          <MarketPanel insights={data?.marketInsights} />
        )}

        {/* Footer */}
        {!loading && !error && (
          <p className="text-xs text-gray-400 text-center mt-6 flex items-center justify-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Powered by GPT-4o · Predictions refresh every 4 hours · Past performance is not a guarantee of future results
          </p>
        )}
      </div>
    </div>
  );
}
