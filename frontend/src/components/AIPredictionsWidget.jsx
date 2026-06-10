import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, RefreshCw, TrendingUp, Target, AlertTriangle,
  CheckCircle, ArrowRight, Zap, BarChart3, Brain,
  ChevronDown, ChevronUp, ExternalLink, Clock, Lightbulb,
  Users, Shield, CalendarDays, Star
} from 'lucide-react';
import { predictionAPI } from '../services/api';
import { AICreditsInline, AICreditsExhaustedModal } from './AICreditsBar';

// ── Win probability ring ────────────────────────────────────────────────────
const WinRing = ({ pct }) => {
  const color =
    pct >= 70 ? '#22c55e' :
    pct >= 45 ? '#f59e0b' :
                '#ef4444';
  const r = 18;
  const circ = 2 * Math.PI * r;
  const fill = (pct / 100) * circ;
  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
        <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
      </div>
    </div>
  );
};

// ── Recommendation badge ────────────────────────────────────────────────────
const RecBadge = ({ rec }) => {
  const styles = {
    'STRONG GO':   'bg-green-100 text-green-700 border-green-200',
    'GO':          'bg-blue-100 text-blue-700 border-blue-200',
    'CONDITIONAL': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'PASS':        'bg-red-100 text-red-700 border-red-200',
  };
  const icons = {
    'STRONG GO':   <CheckCircle className="w-3 h-3" />,
    'GO':          <Zap className="w-3 h-3" />,
    'CONDITIONAL': <AlertTriangle className="w-3 h-3" />,
    'PASS':        <AlertTriangle className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[rec] || styles['GO']}`}>
      {icons[rec]} {rec}
    </span>
  );
};

// ── Market outlook chip ─────────────────────────────────────────────────────
const OutlookChip = ({ outlook }) => {
  const s = {
    Positive: 'bg-green-100 text-green-700',
    Neutral:  'bg-gray-100 text-gray-600',
    Cautious: 'bg-amber-100 text-amber-700',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s[outlook] || s.Neutral}`}>{outlook}</span>;
};

// ── Single prediction card ──────────────────────────────────────────────────
const PredictionCard = ({ pred, index }) => {
  const [expanded, setExpanded] = useState(index === 0);

  const daysLeft = pred.dueDate
    ? Math.ceil((new Date(pred.dueDate) - Date.now()) / 86400000)
    : null;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white min-w-0">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <WinRing pct={pred.winProbability} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <RecBadge rec={pred.recommendation} />
            <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded whitespace-nowrap">{pred.naicsCode}</span>
            {daysLeft !== null && daysLeft <= 14 && (
              <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" />{daysLeft}d left
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-800 truncate">{pred.title}</p>
          <p className="text-xs text-gray-500 truncate">{pred.agency}</p>
        </div>
        <div className="text-gray-400 shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          {/* Fit score bar */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-16 shrink-0">Fit Score</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-indigo-500 transition-all"
                style={{ width: `${(pred.fitScore / 10) * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold text-indigo-600 w-8 text-right">{pred.fitScore}/10</span>
          </div>

          {/* Why it fits */}
          {pred.topReasons?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Why You Fit</p>
              <ul className="space-y-1">
                {pred.topReasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-green-700">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-green-500" />{r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Risks */}
          {pred.risks?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Watch Out For</p>
              <ul className="space-y-1">
                {pred.risks.map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-amber-700">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />{r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Your unique advantage */}
          {pred.uniqueAdvantage && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1"><Star className="w-3 h-3" /> Your Unique Advantage</p>
              <p className="text-xs text-amber-600">{pred.uniqueAdvantage}</p>
            </div>
          )}

          {/* Bid strategy */}
          {pred.bidStrategy && (
            <div className="bg-indigo-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-indigo-700 mb-1 flex items-center gap-1"><Lightbulb className="w-3 h-3" /> AI Bid Strategy</p>
              <p className="text-xs text-indigo-600">{pred.bidStrategy}</p>
            </div>
          )}

          {/* Next action */}
          {pred.nextAction && (
            <div className="bg-green-50 border border-green-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-green-700 mb-1 flex items-center gap-1"><Zap className="w-3 h-3" /> Do This Now</p>
              <p className="text-xs text-green-600">{pred.nextAction}</p>
            </div>
          )}

          {/* Teaming advice */}
          {pred.teamingAdvice && pred.teamingAdvice !== 'Solo bid' && (
            <div className="flex items-start gap-1.5 text-xs text-purple-700">
              <Users className="w-3.5 h-3.5 shrink-0 mt-0.5 text-purple-400" />
              <span><span className="font-semibold">Teaming: </span>{pred.teamingAdvice}</span>
            </div>
          )}

          {/* Confidence + urgency chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              pred.confidenceLevel === 'High'   ? 'bg-green-100 text-green-700' :
              pred.confidenceLevel === 'Medium' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              <Shield className="w-3 h-3 inline mr-0.5" />Confidence: {pred.confidenceLevel}
            </span>
            {pred.urgencyLevel && pred.urgencyLevel !== 'Low' && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                pred.urgencyLevel === 'Critical' ? 'bg-red-100 text-red-700' :
                pred.urgencyLevel === 'High'     ? 'bg-orange-100 text-orange-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                <Clock className="w-3 h-3 inline mr-0.5" />Urgency: {pred.urgencyLevel}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            {pred.url && pred.url !== '#' && (
              <a href={pred.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                <ExternalLink className="w-3.5 h-3.5" /> SAM.gov
              </a>
            )}
            <Link to={`/opportunity/${pred.opportunityId}`}
              className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800">
              <ArrowRight className="w-3.5 h-3.5" /> Full Details
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Market insights panel ───────────────────────────────────────────────────
const MarketInsightsPanel = ({ insights }) => {
  if (!insights) return null;
  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
          <BarChart3 className="w-4 h-4 text-indigo-500" /> Market Intelligence
        </p>
        <OutlookChip outlook={insights.marketOutlook} />
      </div>

      {insights.outlookReason && (
        <p className="text-xs text-gray-500 italic">{insights.outlookReason}</p>
      )}

      <p className="text-xs text-gray-600 leading-relaxed">{insights.weeklyAdvice}</p>

      {/* Budget year insight */}
      {insights.budgetYearInsight && (
        <div className="bg-white/80 border border-indigo-100 rounded-lg p-2.5 flex items-start gap-1.5 text-xs text-indigo-700">
          <CalendarDays className="w-3.5 h-3.5 shrink-0 mt-0.5 text-indigo-500" />
          <span><span className="font-semibold">Budget Cycle: </span>{insights.budgetYearInsight}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-xs">
        {insights.hotAgencies?.length > 0 && (
          <div>
            <p className="font-semibold text-gray-500 mb-1.5">🔥 Active Agencies</p>
            {insights.hotAgencies.slice(0,4).map((a,i) => (
              <p key={i} className="text-gray-700 truncate mb-0.5">{a}</p>
            ))}
          </div>
        )}
        {insights.trendingSectors?.length > 0 && (
          <div>
            <p className="font-semibold text-gray-500 mb-1.5">📈 Trending Work</p>
            {insights.trendingSectors.slice(0,3).map((s,i) => (
              <p key={i} className="text-gray-700 truncate mb-0.5">{s}</p>
            ))}
          </div>
        )}
      </div>

      {insights.hiddenGemAgencies?.length > 0 && (
        <div className="text-xs">
          <p className="font-semibold text-gray-500 mb-1">💎 Hidden Gems (less competition)</p>
          <p className="text-gray-600">{insights.hiddenGemAgencies.join(', ')}</p>
        </div>
      )}

      {insights.setAsideOpportunity && (
        <div className="bg-white/70 rounded-lg p-2.5 text-xs text-indigo-700">
          <span className="font-semibold">Set-Aside Tip: </span>{insights.setAsideOpportunity}
        </div>
      )}

      {insights.topWinningStrategy && (
        <div className="bg-green-50 border border-green-100 rounded-lg p-2.5 text-xs text-green-700">
          <span className="font-semibold flex items-center gap-1 mb-0.5"><Star className="w-3 h-3" /> #1 Win Strategy</span>
          {insights.topWinningStrategy}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-500">
        <span className="whitespace-nowrap"><span className="font-semibold text-gray-700">{insights.totalOpportunities}</span> active</span>
        <span className="whitespace-nowrap">Avg: <span className="font-semibold text-gray-700">${((insights.avgContractValue || 0) / 1e6).toFixed(1)}M</span></span>
        <span className="whitespace-nowrap">Competition: <span className={`font-semibold ${insights.competitionLevel === 'Low' ? 'text-green-600' : insights.competitionLevel === 'High' ? 'text-red-600' : 'text-amber-600'}`}>{insights.competitionLevel}</span></span>
        {insights.bestMonthsToSubmit?.length > 0 && (
          <span className="whitespace-nowrap">Best: <span className="font-semibold text-gray-700">{insights.bestMonthsToSubmit.slice(0, 3).join(', ')}</span></span>
        )}
      </div>
    </div>
  );
};

// ── Main widget ─────────────────────────────────────────────────────────────
export default function AIPredictionsWidget({ userPlan }) {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState(null);
  const [showAll,     setShowAll]     = useState(false);
  const [credits,     setCredits]     = useState(null);
  const [creditError, setCreditError] = useState(null);

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    setCreditError(null);
    try {
      const res = await predictionAPI.getDashboard(refresh);
      setData(res.data.data);
      if (res.data.data?.credits) setCredits(res.data.data.credits);
    } catch (e) {
      const apiErr = e.response?.data;
      if (e.response?.status === 402 && apiErr?.code === 'AI_CREDITS_EXHAUSTED') {
        setCreditError(apiErr);
      } else {
        setError('AI predictions temporarily unavailable.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // Fetch initial credit balance (no cost on first load)
    predictionAPI.getCredits()
      .then(r => { if (r.data.success) setCredits(r.data.data); })
      .catch(() => {});
  }, []);

  const visiblePredictions = data?.predictions
    ? (showAll ? data.predictions : data.predictions.slice(0, 3))
    : [];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm min-w-0">
      {/* Exhausted modal */}
      {creditError && (
        <AICreditsExhaustedModal
          error={creditError}
          feature="ai_predictions"
          onClose={() => setCreditError(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-indigo-600 to-purple-600 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Brain className="w-4 h-4 text-white shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">AI Contract Predictions</p>
            <p className="text-xs text-indigo-200 truncate">Win-probability analysis</p>
          </div>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition disabled:opacity-50 shrink-0 whitespace-nowrap"
          title="Costs 5 AI credits"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Analyzing…' : 'Refresh'}
          <span className="text-white/60 ml-0.5">−5cr</span>
        </button>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="relative">
              <Brain className="w-10 h-10 text-indigo-300" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">AI is analyzing your opportunities</p>
              <p className="text-xs text-gray-400 mt-1">Calculating win probabilities based on your profile…</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 py-6 justify-center text-sm text-gray-500">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            {error}
            <button onClick={() => load()} className="text-indigo-600 underline text-xs">Retry</button>
          </div>
        ) : (
          <>
            {/* Cache notice + credits */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {data?.fromCache ? (
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Predictions from {new Date(data.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — refreshes every 4 hours
                </div>
              ) : <div />}
              {credits && <AICreditsInline credits={credits} />}
            </div>

            {/* Market insights */}
            <MarketInsightsPanel insights={data?.marketInsights} />

            {/* Opportunity predictions */}
            {visiblePredictions.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" /> Top Predicted Opportunities
                </p>
                {visiblePredictions.map((pred, i) => (
                  <PredictionCard key={pred.opportunityId} pred={pred} index={i} />
                ))}

                {data.predictions.length > 3 && (
                  <button
                    onClick={() => setShowAll(s => !s)}
                    className="w-full py-2 text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1"
                  >
                    {showAll
                      ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
                      : <><ChevronDown className="w-3.5 h-3.5" /> Show {data.predictions.length - 3} more predictions</>
                    }
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No opportunities in your feed yet.</p>
                <p className="text-xs mt-1">Add NAICS codes in your profile to start matching.</p>
              </div>
            )}

            {/* Footer */}
            <div className="text-xs text-gray-400 flex items-center gap-1 pt-1 border-t border-gray-50">
              <TrendingUp className="w-3 h-3" />
              Powered by GPT-4 · Based on your NAICS {data?.userProfile?.naicsCodes?.join(', ')}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
