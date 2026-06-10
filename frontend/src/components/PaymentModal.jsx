// frontend/src/components/PaymentModal.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Lock, CheckCircle, Zap, Wallet, AlertCircle, Loader } from 'lucide-react';
import PayPalPayment from './PayPalPayment';
import { referralAPI } from '../services/referralApi';

const MIN_BALANCE_TO_USE = 100;

const PLAN_COLORS = {
  starter:    'from-blue-500 to-blue-600',
  pro:        'from-indigo-500 to-purple-600',
  enterprise: 'from-amber-500 to-orange-600',
};

// Plans whose yearly billing goes through the annual request form — NOT PayPal
const MONTHLY_ONLY_PLANS = ['starter', 'pro'];

export default function PaymentModal({ isOpen, onClose, plan, billingCycle: billingCycleProp = 'monthly' }) {
  const navigate = useNavigate();
  const [cycle, setCycle]                     = useState(billingCycleProp);
  const [referralBalance, setReferralBalance] = useState(0);
  const [useBalance, setUseBalance]           = useState(false);
  const [balanceToApply, setBalanceToApply]   = useState(0);
  const [applying, setApplying]               = useState(false);
  const [appliedMsg, setAppliedMsg]           = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setCycle(billingCycleProp);
    setUseBalance(false);
    setBalanceToApply(0);
    setAppliedMsg(null);
    referralAPI.getStats()
      .then(r => setReferralBalance(r.data.data.referralBalance || 0))
      .catch(() => {});
  }, [isOpen, billingCycleProp]);

  if (!isOpen || !plan) return null;

  const planId          = plan.name;
  const planDisplayName = plan.displayName || plan.name;
  // Starter and Pro have yearly plans via the request form — lock them to monthly in this modal
  const isMonthlyOnly   = MONTHLY_ONLY_PLANS.includes(planId);
  const effectiveCycle  = isMonthlyOnly ? 'monthly' : cycle;
  const baseAmount      = effectiveCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
  const canUseBalance   = referralBalance >= MIN_BALANCE_TO_USE;
  const maxApply        = Math.min(referralBalance, baseAmount);
  const effectiveAmount = useBalance ? Math.max(0, baseAmount - balanceToApply) : baseAmount;
  const gradient        = PLAN_COLORS[planId] || PLAN_COLORS.pro;
  // Use features from the plan object (fetched from DB) — fall back to empty array
  const features        = (plan.features || []).filter(f => f.included).map(f => f.name);
  const yearlySavingsPct = plan.priceMonthly > 0 && plan.priceYearly > 0
    ? Math.round(((plan.priceMonthly * 12 - plan.priceYearly) / (plan.priceMonthly * 12)) * 100)
    : 0;

  const handleActivateWithBalance = async () => {
    setApplying(true);
    setAppliedMsg(null);
    try {
      const res = await referralAPI.activateWithBalance({ plan: planId, billingCycle: effectiveCycle, amount: baseAmount });
      setAppliedMsg({ success: true, message: res.data.message });
      setTimeout(() => {
        onClose();
        navigate('/dashboard');
      }, 2000);
    } catch (e) {
      setAppliedMsg({ type: 'error', message: e.response?.data?.message || 'Activation failed. Please try again.' });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl">

        {/* Header gradient */}
        <div className={`bg-gradient-to-r ${gradient} p-6 rounded-t-2xl relative`}>
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-5 h-5 text-white/80" />
            <span className="text-white/80 text-sm font-medium uppercase tracking-wide">Upgrade to</span>
          </div>
          <h2 className="text-2xl font-bold text-white">{planDisplayName} Plan</h2>

          {/* Billing cycle toggle — only shown for Enterprise (starter/pro yearly → request form) */}
          {plan.priceMonthly > 0 && !isMonthlyOnly && (
            <div className="inline-flex mt-3 bg-white/20 rounded-full p-0.5">
              <button
                type="button"
                onClick={() => { setCycle('monthly'); setUseBalance(false); setBalanceToApply(0); }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  effectiveCycle === 'monthly' ? 'bg-white text-indigo-700' : 'text-white/80 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => { setCycle('yearly'); setUseBalance(false); setBalanceToApply(0); }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  effectiveCycle === 'yearly' ? 'bg-white text-indigo-700' : 'text-white/80 hover:text-white'
                }`}
              >
                Yearly
                {yearlySavingsPct > 0 && <span className="ml-1 opacity-80">Save {yearlySavingsPct}%</span>}
              </button>
            </div>
          )}

          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-4xl font-extrabold text-white">${baseAmount}</span>
            <span className="text-white/70 text-sm">/{effectiveCycle === 'yearly' ? 'year' : 'month'}</span>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* What you get */}
          {features.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">What's included</p>
              <ul className="space-y-2">
                {features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Referral balance section */}
          {referralBalance > 0 && (
            <div className={`border rounded-xl p-4 ${canUseBalance ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Wallet className={`w-4 h-4 ${canUseBalance ? 'text-green-600' : 'text-gray-500'}`} />
                  <span className={`text-sm font-semibold ${canUseBalance ? 'text-green-800' : 'text-gray-700'}`}>Referral Balance</span>
                </div>
                <span className={`text-sm font-bold ${canUseBalance ? 'text-green-700' : 'text-gray-600'}`}>
                  ${referralBalance.toFixed(2)} available
                </span>
              </div>

              {!canUseBalance ? (
                <p className="text-xs text-gray-500 mt-1">
                  You need at least <strong>${MIN_BALANCE_TO_USE}</strong> in referral balance to apply it toward a purchase.
                </p>
              ) : (
                <>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useBalance}
                      onChange={e => {
                        setUseBalance(e.target.checked);
                        setBalanceToApply(e.target.checked ? maxApply : 0);
                        setAppliedMsg(null);
                      }}
                      className="w-4 h-4 text-green-600 rounded"
                    />
                    <span className="text-sm text-green-700">Apply referral balance to this payment</span>
                  </label>
                  {useBalance && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-green-700">Apply $</span>
                        <input
                          type="number"
                          min="1"
                          max={maxApply}
                          step="0.01"
                          value={balanceToApply}
                          onChange={e => setBalanceToApply(Math.min(parseFloat(e.target.value) || 0, maxApply))}
                          className="w-24 border border-green-300 rounded px-2 py-1 text-sm text-center focus:ring-2 focus:ring-green-400"
                        />
                        <span className="text-xs text-green-700">of ${maxApply.toFixed(2)} max</span>
                      </div>
                      {effectiveAmount === 0 ? (
                        <p className="text-xs text-green-700 font-semibold">
                          Your balance fully covers this plan — no payment needed!
                        </p>
                      ) : (
                        <p className="text-xs text-green-700">
                          Remaining to pay: <span className="font-bold">${effectiveAmount.toFixed(2)}</span>
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Applied message */}
          {appliedMsg && (
            <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
              appliedMsg.fullyCovered || appliedMsg.success
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}>
              {appliedMsg.fullyCovered || appliedMsg.success
                ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              {appliedMsg.message}
            </div>
          )}

          {/* Billing summary */}
          <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center text-sm">
            <div>
              <span className="text-gray-600">Total due today</span>
              {useBalance && balanceToApply > 0 && (
                <p className="text-xs text-green-600 mt-0.5">After ${balanceToApply.toFixed(2)} referral credit</p>
              )}
            </div>
            <span className="text-lg font-bold text-gray-900">${effectiveAmount.toFixed(2)} USD</span>
          </div>

          {/* Security note */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <Lock className="w-3 h-3" />
            256-bit SSL encryption · PayPal buyer protection
          </div>

          {/* Payment area: if fully covered by balance → show activate button, else show PayPal */}
          {effectiveAmount === 0 ? (
            <button
              onClick={handleActivateWithBalance}
              disabled={applying}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {applying ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Activating…
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Activate with Referral Balance
                </>
              )}
            </button>
          ) : (
            <PayPalPayment
              amount={effectiveAmount}
              planName={planId}
              billingCycle={effectiveCycle}
              referralBalanceToApply={useBalance ? balanceToApply : 0}
              onSuccess={() => {}}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
