import { useState, useEffect } from 'react';
import { Zap, AlertTriangle } from 'lucide-react';
import { predictionAPI } from '../services/api';
import CreditTopUpModal from './CreditTopUpModal';

// All AI features = 15 credits per request
export const FEATURE_COSTS = {
  summarize:            15,
  ask_question:         15,
  capability_statement: 15,
  sources_sought:       15,
  past_performance:     15,
  analyze_attachment:   15,
  market_research:      15,
  bid_analysis:         15,
  risk_assessment:      15,
  competitive_analysis: 15,
  rfp_analyzer:         15,
  incumbent:            15,
  ai_predictions:       15,
  full_proposal:        15,
  go_no_go:             15,
};

// ── Compact inline badge ──────────────────────────────────────────────────────
export function AICreditsInline({ credits }) {
  if (!credits) return null;
  const low   = credits.remaining <= Math.ceil(credits.limit * 0.2);
  const empty = credits.remaining === 0;

  return (
    <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${
      empty ? 'bg-red-50 border-red-200 text-red-700' :
      low   ? 'bg-amber-50 border-amber-200 text-amber-700' :
              'bg-indigo-50 border-indigo-200 text-indigo-700'
    }`}>
      <Zap className="w-3 h-3" />
      {credits.remaining} / {credits.limit} AI credits
    </div>
  );
}

// ── Full bar ──────────────────────────────────────────────────────────────────
export function AICreditsBar({ feature, onCreditsLoaded }) {
  const [credits,   setCredits]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [showTopup, setShowTopup] = useState(false);

  useEffect(() => {
    predictionAPI.getCredits()
      .then(r => {
        setCredits(r.data.data);
        onCreditsLoaded?.(r.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!credits || credits.limit === 0) return null;

  const pct      = credits.limit > 0 ? Math.min(100, (credits.used / credits.limit) * 100) : 100;
  const low      = credits.remaining <= Math.ceil(credits.limit * 0.2);
  const empty    = credits.remaining === 0;
  const cost     = feature ? FEATURE_COSTS[feature] : null;
  const canAfford = cost ? credits.remaining >= cost : credits.remaining > 0;

  const nextReset = new Date(credits.resetDate);
  nextReset.setMonth(nextReset.getMonth() + 1);
  nextReset.setDate(1);
  const resetLabel = nextReset.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <>
      <div className={`rounded-xl border px-4 py-3 mb-5 ${
        empty ? 'bg-red-50 border-red-200' :
        low   ? 'bg-amber-50 border-amber-200' :
                'bg-white border-gray-200'
      }`}>
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${empty ? 'text-red-500' : low ? 'text-amber-500' : 'text-indigo-500'}`} />
            <span className="text-sm font-semibold text-gray-800">
              AI Credits
              {cost && (
                <span className={`ml-2 text-xs font-normal ${canAfford ? 'text-gray-500' : 'text-red-600'}`}>
                  ({cost} credit{cost !== 1 ? 's' : ''} for this feature)
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-bold ${empty ? 'text-red-600' : low ? 'text-amber-700' : 'text-gray-700'}`}>
              {credits.remaining} <span className="font-normal text-xs text-gray-400">/ {credits.limit} left</span>
            </span>
            {(low || empty) && (
              <button
                onClick={() => setShowTopup(true)}
                className="text-xs text-indigo-600 font-medium hover:underline shrink-0"
              >
                Buy Credits →
              </button>
            )}
          </div>
        </div>

        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${
              empty ? 'bg-red-400' : low ? 'bg-amber-400' : 'bg-indigo-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {empty && (
          <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            No credits remaining. Resets {resetLabel} or{' '}
            <button onClick={() => setShowTopup(true)} className="underline font-medium">buy a top-up pack</button>.
          </p>
        )}
        {!empty && low && (
          <p className="text-xs text-amber-600 mt-2">
            Running low — resets {resetLabel}.{' '}
            <button onClick={() => setShowTopup(true)} className="underline font-medium">Buy more credits</button>.
          </p>
        )}
      </div>

      {showTopup && (
        <CreditTopUpModal
          feature={feature || 'general'}
          creditsData={empty ? credits : null}
          onClose={() => setShowTopup(false)}
        />
      )}
    </>
  );
}

// ── Exhausted modal overlay (triggered by 402 API error) ─────────────────────
export function AICreditsExhaustedModal({ error, feature, onClose }) {
  const [showTopup, setShowTopup] = useState(false);

  const isExhausted = error?.code === 'AI_CREDITS_EXHAUSTED' || error?.includes?.('credits');
  if (!isExhausted) return null;

  const data = error?.data || {};

  if (showTopup) {
    return (
      <CreditTopUpModal
        feature={feature || 'general'}
        creditsData={data}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Zap className="w-7 h-7 text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">AI Credits Exhausted</h2>
        <p className="text-sm text-gray-500 mb-2">
          You've used all <strong>{data.limit}</strong> AI credits for this month.
        </p>
        <p className="text-xs text-gray-400 mb-5">
          Credits reset on{' '}
          <strong>
            {data.nextReset
              ? new Date(data.nextReset).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
              : 'next month'}
          </strong>. Or buy a credit top-up pack.
        </p>
        <div className="flex gap-2 justify-center">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Close
          </button>
          <button
            onClick={() => setShowTopup(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            Buy Credits
          </button>
        </div>
      </div>
    </div>
  );
}

export default AICreditsBar;
