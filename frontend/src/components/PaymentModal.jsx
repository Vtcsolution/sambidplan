// frontend/src/components/PaymentModal.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Lock, CheckCircle, Zap, Wallet, AlertCircle, Loader, CreditCard } from 'lucide-react';
import PayPalPayment from './PayPalPayment';
import { referralAPI } from '../services/referralApi';
import { paymentAPI } from '../services/api';

const MIN_BALANCE_TO_USE = 100;

const PLAN_COLORS = {
  starter:    'from-blue-500 to-blue-600',
  pro:        'from-indigo-500 to-purple-600',
  enterprise: 'from-amber-500 to-orange-600',
};

// Plans whose yearly billing goes through the annual request form — NOT PayPal
const MONTHLY_ONLY_PLANS = ['starter', 'pro'];

export default function PaymentModal({ isOpen, onClose, plan, billingCycle: billingCycleProp = 'monthly', couponCode = '', couponDiscount = 0 }) {
  const navigate = useNavigate();
  const [cycle, setCycle]                     = useState(billingCycleProp);
  const [referralBalance, setReferralBalance] = useState(0);
  const [useBalance, setUseBalance]           = useState(false);
  const [balanceToApply, setBalanceToApply]   = useState(0);
  const [applying, setApplying]               = useState(false);
  const [appliedMsg, setAppliedMsg]           = useState(null);
  const [gateways, setGateways]              = useState({ stripe: true, paypal: true, payoneer: false });
  const [payMethod, setPayMethod]            = useState('paypal');
  const [stripeLoading, setStripeLoading]    = useState(false);

  // Fetch which gateways admin has enabled
  useEffect(() => {
    paymentAPI.getGateways?.()
      .then(r => {
        if (r.data?.success) {
          setGateways(r.data.data);
          if (r.data.data.stripe && !r.data.data.paypal) setPayMethod('stripe');
          else setPayMethod('paypal');
        }
      })
      .catch(() => {});
  }, []);

  const handleStripeCheckout = async () => {
    setStripeLoading(true);
    try {
      const res = await paymentAPI.stripeCreateIntent({
        planName: plan?.name, billingCycle: cycle,
        referralBalanceToApply: useBalance ? balanceToApply : 0,
        couponCode,
      });
      if (res.data?.success && res.data.data?.url) {
        window.location.href = res.data.data.url;
        return;
      }
      alert(res.data?.message || 'Stripe checkout failed. Please try again.');
    } catch (e) {
      alert(e.response?.data?.message || 'Stripe error. Please try again.');
    }
    setStripeLoading(false);
  };

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
  const rawAmount       = effectiveCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
  const couponSaving    = couponDiscount > 0 ? Math.round(rawAmount * couponDiscount / 100 * 100) / 100 : 0;
  const baseAmount      = Math.round((rawAmount - couponSaving) * 100) / 100;
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

          <div className="flex items-baseline gap-2 mt-2 flex-wrap">
            {couponSaving > 0 && (
              <span className="text-2xl font-bold text-white/50 line-through">${rawAmount}</span>
            )}
            <span className="text-4xl font-extrabold text-white">${baseAmount}</span>
            <span className="text-white/70 text-sm">/{effectiveCycle === 'yearly' ? 'year' : 'month'}</span>
          </div>
          {couponSaving > 0 && (
            <p className="text-white/80 text-xs mt-1">{couponDiscount}% coupon applied — saving ${couponSaving.toFixed(2)}</p>
          )}
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
              {couponSaving > 0 && (
                <p className="text-xs text-green-600 mt-0.5">Coupon saves ${couponSaving.toFixed(2)}</p>
              )}
              {useBalance && balanceToApply > 0 && (
                <p className="text-xs text-green-600 mt-0.5">After ${balanceToApply.toFixed(2)} referral credit</p>
              )}
            </div>
            <span className="text-lg font-bold text-gray-900">${effectiveAmount.toFixed(2)} USD</span>
          </div>

          {/* Security note */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <Lock className="w-3 h-3" />
            256-bit SSL encryption · Secure payment
          </div>

          {/* Payment area */}
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
            <div className="space-y-3">
              {/* Gateway selection tabs */}
              <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
                {gateways.paypal && (
                  <button onClick={() => setPayMethod('paypal')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition ${payMethod === 'paypal' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                    <img src="https://www.paypalobjects.com/webstatic/icon/pp258.png" className="w-5 h-5" alt="PayPal" />
                    PayPal
                  </button>
                )}
                {gateways.stripe && (
                  <button onClick={() => setPayMethod('stripe')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition ${payMethod === 'stripe' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                    <svg viewBox="0 0 28 28" className="w-5 h-5" fill="none"><rect width="28" height="28" rx="6" fill="#635BFF"/><path d="M13.3 11.2c0-.7.6-1 1.5-1 1.3 0 3 .4 4.3 1.1V7.5c-1.4-.6-2.9-.8-4.3-.8-3.5 0-5.9 1.8-5.9 4.9 0 4.8 6.5 4 6.5 6.1 0 .8-.7 1.1-1.7 1.1-1.5 0-3.4-.6-4.9-1.4v3.9c1.7.7 3.3 1 4.9 1 3.6 0 6-1.8 6-4.9 0-5.2-6.4-4.3-6.4-6.2z" fill="#fff"/></svg>
                    Stripe
                  </button>
                )}
              </div>

              {/* PayPal payment */}
              {payMethod === 'paypal' && gateways.paypal && (
                <PayPalPayment
                  amount={effectiveAmount}
                  planName={planId}
                  billingCycle={effectiveCycle}
                  referralBalanceToApply={useBalance ? balanceToApply : 0}
                  couponCode={couponCode}
                  onSuccess={() => {}}
                  onClose={onClose}
                />
              )}

              {/* Stripe payment */}
              {payMethod === 'stripe' && gateways.stripe && (
                <div className="space-y-3">
                  {/* Accepted cards */}
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xs text-gray-400">Accepted:</span>
                    <div className="flex gap-1.5">
                      {/* Visa */}
                      <svg viewBox="0 0 38 24" className="h-6 w-auto"><rect width="38" height="24" rx="4" fill="#1A1F71"/><path d="M15.8 15.5l1.7-10h2.7l-1.7 10h-2.7zm11-10l-2.5 6.9-.3-1.5-1-4.8s-.1-.6-.7-.6h-3.8l-.1.3s.7.2 1.6.7l2.5 9h2.8l4.3-10h-2.8zm-4.6 10l1.1-2.8h3.1l.6 2.8h2.5l-2.2-10h-2.3c-.5 0-1 .3-1.1.8l-4 9.2h2.3z" fill="#fff"/><path d="M12.3 5.5l-2.7 6.8-.3-1.4-.9-4.8c-.1-.4-.5-.6-.9-.6H4l-.1.3c1 .3 2.2.7 2.9 1.2l2.4 9h2.8l4.3-10h-4z" fill="#F7B600"/></svg>
                      {/* Mastercard */}
                      <svg viewBox="0 0 38 24" className="h-6 w-auto"><rect width="38" height="24" rx="4" fill="#252525"/><circle cx="15" cy="12" r="7" fill="#EB001B"/><circle cx="23" cy="12" r="7" fill="#F79E1B"/><path d="M19 7.3a7 7 0 010 9.4 7 7 0 000-9.4z" fill="#FF5F00"/></svg>
                      {/* Amex */}
                      <svg viewBox="0 0 38 24" className="h-6 w-auto"><rect width="38" height="24" rx="4" fill="#2557D6"/><text x="19" y="14" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="bold" fontFamily="Arial">AMEX</text></svg>
                    </div>
                  </div>

                  <button
                    onClick={handleStripeCheckout}
                    disabled={stripeLoading}
                    className="w-full bg-[#635BFF] hover:bg-[#5349E0] disabled:opacity-60 text-white font-bold py-3.5 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {stripeLoading ? (
                      <><Loader className="w-4 h-4 animate-spin" /> Redirecting to Stripe…</>
                    ) : (
                      <><CreditCard className="w-4 h-4" /> Pay ${effectiveAmount.toFixed(2)} with Card</>
                    )}
                  </button>

                  {/* Powered by Stripe */}
                  <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
                    <span>Powered by</span>
                    <svg viewBox="0 0 60 25" className="h-4 w-auto"><path d="M5 10.2c0-1.6 1.3-2.2 2.5-2.2 2.2 0 4.1.7 5.6 1.6V5c-1.9-.7-3.7-1-5.6-1C3.2 4 0 6.5 0 10.7c0 6.6 9 5.5 9 8.4 0 1.4-1.2 1.8-2.9 1.8-2.5 0-5-.9-7.1-2v4.9c2.4 1 4.8 1.4 7.1 1.4 4.4 0 7.5-2.2 7.5-6.3C13.6 12 5 13 5 10.2zM21.1 4.3l-3.4.7v3.5h-1.5v3.9h1.5v5c0 2.5 1.2 4 3.7 4 1.1 0 1.9-.2 2.4-.5v-3.6c-.4.2-2.1.6-2.1-1.1v-3.8h2.1V8.5h-2.1V4.3h-.6zm7.3 5.3l-.2-1.1h-3.2v15h3.5v-10.2c.8-1.1 2.2-.9 2.7-.7V8.5c-.5-.2-2.3-.5-3 1.1h.2zm5.1-1.1h3.5v15h-3.5V8.5zm0-4.5l3.5-.7v3.6l-3.5.7V4zm8.6 4.4h-3.3V24h3.5V14c.6-.8 1.6-1 2.2-1 .7 0 1.8.2 2.4.6V8.8c-.5-.2-2.3-.5-3.3.9L43 8.4h.1zm7.3 11c0 3 2.4 4.8 5.6 4.8 1.6 0 2.8-.4 3.6-.9V19.7c-.8.5-1.7.8-2.8.8-1.4 0-2.8-.5-2.8-2.6V12h2.8V8.5h-2.8V4.8l-3.5.7v18h-.1z" fill="#6772E5"/></svg>
                  </div>
                </div>
              )}

              {/* Auto-select if only one gateway available */}
              {!gateways.paypal && gateways.stripe && payMethod !== 'stripe' && setPayMethod('stripe') && null}
              {gateways.paypal && !gateways.stripe && payMethod !== 'paypal' && setPayMethod('paypal') && null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
