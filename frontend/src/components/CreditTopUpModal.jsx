import { useState, useRef } from 'react';
import { X, Zap, CheckCircle, Loader2, ShieldCheck, AlertCircle, Sparkles, Brain, FileText, Trophy, FileSearch, ScanSearch, ThumbsUp, Crown } from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { creditTopupAPI } from '../services/api';
import { useUserPlan } from '../hooks/useUserPlan';

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';

// ── Credit packs by plan tier ─────────────────────────────────────────────────
const STARTER_PACKS = [
  { id: 'spark_25',  credits: 25,  price: 4.99,  label: 'Spark Pack',    desc: 'Quick top-up',  popular: false },
  { id: 'boost_75',  credits: 75,  price: 11.99, label: 'Boost Pack',    desc: 'Most popular',  popular: true  },
  { id: 'power_200', credits: 200, price: 24.99, label: 'Power Pack',    desc: 'Best value',    popular: false },
];

const PRO_PACKS = [
  { id: 'pro_200',  credits: 200,  price: 29, label: 'Standard Pack', desc: '200 AI credits',  popular: false },
  { id: 'pro_400',  credits: 400,  price: 49, label: 'Growth Pack',   desc: 'Best value',      popular: true  },
  { id: 'pro_1000', credits: 1000, price: 99, label: 'Power Pack',    desc: '1000 AI credits', popular: false },
];

// ── Feature header meta ───────────────────────────────────────────────────────
const FEATURE_META = {
  ai_predictions:       { label: 'AI Contract Predictions', Icon: Brain,       color: 'text-purple-600', bg: 'bg-purple-100' },
  full_proposal:        { label: 'Write Full Proposal',     Icon: FileText,    color: 'text-blue-600',   bg: 'bg-blue-100'   },
  past_performance:     { label: 'Past Performance Repo',   Icon: Trophy,      color: 'text-green-600',  bg: 'bg-green-100'  },
  sources_sought:       { label: 'Sources Sought',          Icon: FileSearch,  color: 'text-violet-600', bg: 'bg-violet-100' },
  capability_statement: { label: 'Capability Statement',    Icon: Sparkles,    color: 'text-indigo-600', bg: 'bg-indigo-100' },
  rfp_analyzer:         { label: 'Analyze a Solicitation',  Icon: ScanSearch,  color: 'text-sky-600',    bg: 'bg-sky-100'    },
  go_no_go:             { label: 'Go/No-Go Decision',       Icon: ThumbsUp,    color: 'text-emerald-600',bg: 'bg-emerald-100'},
};

// ── PayPal SDK loading state ──────────────────────────────────────────────────
function PayPalLoader() {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();
  if (isRejected) return (
    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 text-center">
      PayPal failed to load. Please refresh.
    </div>
  );
  if (!isPending) return null;
  return (
    <div className="flex items-center justify-center gap-2 py-4 text-gray-400 text-sm">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading PayPal…
    </div>
  );
}

// ── PayPal smart buttons ──────────────────────────────────────────────────────
function TopupButtons({ pack, feature, onSuccess, onError }) {
  const orderIdRef = useRef(null);

  const createOrder = async () => {
    const res = await creditTopupAPI.createOrder({ packageId: pack.id });
    if (!res.data.success) throw new Error(res.data.message);
    orderIdRef.current = res.data.orderId;
    return res.data.orderId;
  };

  const onApprove = async (data) => {
    const res = await creditTopupAPI.capture({ orderId: data.orderID, packageId: pack.id, feature });
    if (res.data.success) onSuccess(res.data);
    else onError(res.data.message || 'Capture failed.');
  };

  return (
    <PayPalButtons
      style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay', height: 44 }}
      fundingSource={undefined}
      createOrder={createOrder}
      onApprove={onApprove}
      onError={(err) => {
        const msg = err?.message || '';
        if (msg.includes('Window is closed') || msg.includes('can not determine type')) return;
        onError(msg || 'PayPal error. Please try again.');
      }}
      onCancel={() => {}}
    />
  );
}

// ── Pack card ─────────────────────────────────────────────────────────────────
function PackCard({ pack, selected, onSelect, isPro }) {
  return (
    <button
      onClick={() => onSelect(pack.id)}
      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 text-left transition ${
        selected === pack.id
          ? 'border-indigo-500 bg-indigo-50'
          : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selected === pack.id ? 'bg-indigo-100' : 'bg-gray-100'}`}>
          <Zap className={`w-4 h-4 ${selected === pack.id ? 'text-indigo-600' : 'text-gray-500'}`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">{pack.label}</span>
            {pack.popular && (
              <span className="text-[10px] font-bold bg-indigo-600 text-white rounded-full px-2 py-0.5">POPULAR</span>
            )}
          </div>
          <span className="text-xs text-gray-500">{pack.credits} AI credits · {pack.desc}</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <span className="text-base font-bold text-gray-900">${pack.price}</span>
        <p className="text-xs text-gray-400">
          ${(pack.price / pack.credits).toFixed(2)}/credit
        </p>
      </div>
    </button>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function CreditTopUpModal({ feature = 'general', creditsData, onClose }) {
  const { plan } = useUserPlan();
  const [selected, setSelected] = useState(null);
  const [step,     setStep]     = useState('pick'); // pick | pay | done
  const [error,    setError]    = useState('');
  const [doneData, setDoneData] = useState(null);

  const isPro  = ['pro', 'enterprise'].includes(plan);
  const packs  = isPro ? PRO_PACKS : STARTER_PACKS;
  const meta   = FEATURE_META[feature] || { label: 'AI Feature', Icon: Zap, color: 'text-indigo-600', bg: 'bg-indigo-100' };
  const { Icon } = meta;

  const handleSuccess = (res) => { setDoneData(res.purchase); setStep('done'); };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative">

        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-1">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${meta.bg}`}>
              <Icon className={`w-4 h-4 ${meta.color}`} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                Buy AI Credits
                {isPro && <span className="text-[10px] font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1"><Crown className="w-2.5 h-2.5" /> {plan === 'enterprise' ? 'Enterprise' : 'Pro'}</span>}
              </h2>
              <p className="text-xs text-gray-500">{meta.label}</p>
            </div>
          </div>
          {creditsData && (
            <div className="mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              You've used all {creditsData.limit} credits this month. Credits reset{' '}
              {new Date(creditsData.nextReset || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.
            </div>
          )}
        </div>

        <div className="p-6">

          {/* ── Pick pack ──────────────────────────────────────────────────── */}
          {step === 'pick' && (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Credits are added after admin approval (usually within a few hours).
              </p>

              <div className="space-y-3 mb-5">
                {packs.map(pack => (
                  <PackCard
                    key={pack.id}
                    pack={pack}
                    selected={selected}
                    onSelect={setSelected}
                    isPro={isPro}
                  />
                ))}
              </div>

              <button
                onClick={() => { if (selected) setStep('pay'); }}
                disabled={!selected}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue to Payment
              </button>

              <p className="text-xs text-center text-gray-400 mt-3 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                Credits added after admin review · Secured by PayPal
              </p>
            </>
          )}

          {/* ── Pay ────────────────────────────────────────────────────────── */}
          {step === 'pay' && (() => {
            const pack = packs.find(p => p.id === selected);
            if (!pack) return null;
            return (
              <>
                <button
                  onClick={() => setStep('pick')}
                  className="text-xs text-indigo-600 hover:underline mb-4 flex items-center gap-1"
                >
                  ← Change pack
                </button>

                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 mb-4 text-center border border-indigo-100">
                  <p className="text-xs text-gray-500 mb-1">You're purchasing</p>
                  <p className="text-2xl font-bold text-indigo-700">
                    {pack.credits} <span className="text-base font-normal text-gray-500">AI credits</span>
                  </p>
                  <p className="text-sm font-semibold text-gray-700 mt-0.5">${pack.price} · {pack.label}</p>
                </div>

                {error && (
                  <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}

                {PAYPAL_CLIENT_ID ? (
                  <PayPalScriptProvider
                    key={pack.id}
                    options={{ clientId: PAYPAL_CLIENT_ID, currency: 'USD', intent: 'capture', components: 'buttons' }}
                  >
                    <PayPalLoader />
                    <TopupButtons
                      pack={pack}
                      feature={feature}
                      onSuccess={handleSuccess}
                      onError={(msg) => setError(msg)}
                    />
                  </PayPalScriptProvider>
                ) : (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                    PayPal not configured. Contact support.
                  </div>
                )}
              </>
            );
          })()}

          {/* ── Done ───────────────────────────────────────────────────────── */}
          {step === 'done' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Payment Received!</h3>
              <p className="text-sm text-gray-600 mb-1">
                Your <strong>{doneData?.credits} AI credits</strong> request is pending admin approval.
              </p>
              <p className="text-xs text-gray-400 mb-5">
                Credits will be added to your account within a few hours after verification.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition text-sm"
              >
                Got it
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
