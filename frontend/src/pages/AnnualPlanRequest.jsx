import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2, ArrowRight, Calendar, Shield, Clock, Star, CreditCard, FileText } from 'lucide-react';
import { paymentAPI } from '../services/api';
import PayPalPayment from '../components/PayPalPayment';
import SEOHead from '../components/SEOHead';

// Yearly prices = 20% off monthly×12. Keep in sync with backend/models/Plan.js.
const PLAN_INFO = {
  starter: {
    label:      'Starter Annual',
    price:      '$278 / year',
    rawPrice:   278,
    monthlyEq:  '~$23/mo',
    savings:    'Save $70/year vs monthly',
    color:      'from-blue-500 to-blue-600',
    features:   ['500 matches/month', 'Advanced contract search', 'Priority email support', '14-day source window'],
  },
  pro: {
    label:      'Pro Annual',
    price:      '$758 / year',
    rawPrice:   758,
    monthlyEq:  '~$63/mo',
    savings:    'Save $190/year vs monthly',
    color:      'from-indigo-500 to-purple-600',
    features:   ['3,000 matches/month', 'AI proposal generation', 'Real-time tracking', '60-day source window', '24/7 priority support'],
  },
  enterprise: {
    label:      'Enterprise Annual',
    price:      '$4,788 / year',
    rawPrice:   4788,
    monthlyEq:  '~$399/mo',
    savings:    'Save $1,200/year vs monthly',
    color:      'from-purple-600 to-violet-700',
    features:   ['Unlimited matches', 'AI proposal generation', 'Dedicated account manager', 'Custom NAICS monitoring', '24/7 priority support', 'Full API access', 'White-glove onboarding'],
  },
};

const MANUAL_PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer / Wire' },
  { value: 'payoneer',      label: 'Payoneer' },
  { value: 'credit_card',   label: 'Credit Card (manual invoice)' },
];

export default function AnnualPlanRequest() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const planKey = params.get('plan') || 'starter';
  const plan    = PLAN_INFO[planKey] || PLAN_INFO.pro; // pro as safe fallback

  // 'choose' | 'paypal' | 'manual'
  const [checkoutMode, setCheckoutMode] = useState('choose');

  const [form, setForm]       = useState({
    name:          '',
    email:         '',
    company:       '',
    phone:         '',
    paymentMethod: 'bank_transfer',
    notes:         '',
  });
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [error,    setError]    = useState('');
  const [isAuth,   setIsAuth]   = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (token) {
      setIsAuth(true);
      const name  = localStorage.getItem('userName')  || '';
      const email = localStorage.getItem('userEmail') || sessionStorage.getItem('userEmail') || '';
      setForm(f => ({ ...f, name, email }));
    }
  }, []);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim())    { setError('Full name is required.');     return; }
    if (!form.email.trim())   { setError('Email address is required.'); return; }
    if (!form.company.trim()) { setError('Company name is required.');  return; }
    setLoading(true);
    setError('');
    try {
      if (isAuth) {
        await paymentAPI.createPlanRequest({
          requestedPlan:  planKey,
          billingCycle:   'yearly',
          paymentMethod:  form.paymentMethod,
          notes:          `Company: ${form.company}. Phone: ${form.phone || 'N/A'}. ${form.notes}`.trim(),
        });
      } else {
        navigate(`/signup?redirect=/annual-plan-request?plan=${planKey}`);
        return;
      }
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
          <Shield className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in to continue</h2>
          <p className="text-gray-500 text-sm mb-6">You need an account to request an annual plan.</p>
          <Link to={`/signup?redirect=/annual-plan-request?plan=${planKey}`}
            className="block w-full text-center bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 mb-3">
            Create account
          </Link>
          <Link to={`/login?redirect=/annual-plan-request?plan=${planKey}`}
            className="block w-full text-center border border-gray-300 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-50">
            Log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-10 px-4">
      <SEOHead title="Annual Plan Request — Sambid" noindex={true} />
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold mb-4">
            <Calendar className="w-3.5 h-3.5" />
            Annual Plan — Manual Review & Activation
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Request Annual Plan</h1>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Our team reviews every annual plan request and activates your account within 1 business day after payment is confirmed.
          </p>
        </div>

        {success ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            {checkoutMode === 'paypal' ? (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Payment Successful! 🎉</h2>
                <p className="text-gray-600 text-sm mb-2">
                  Your <strong>{plan.label}</strong> ({plan.price}) is now active.
                </p>
                <p className="text-gray-500 text-sm mb-6">
                  Your account has been upgraded instantly. Start finding federal contracts now.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
                <p className="text-gray-600 text-sm mb-2">
                  We've received your request for the <strong>{plan.label}</strong> ({plan.price}).
                </p>
                <p className="text-gray-500 text-sm mb-6">
                  Our team will email you within 1 business day with payment instructions and activation details.
                </p>
              </>
            )}
            <Link to="/dashboard"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-700">
              Go to Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-5 gap-6">

            {/* Plan summary card */}
            <div className="sm:col-span-2">
              <div className={`bg-gradient-to-br ${plan.color} text-white rounded-2xl p-6 mb-4`}>
                <p className="text-white/80 text-xs font-semibold uppercase tracking-wide mb-1">Selected Plan</p>
                <h2 className="text-xl font-bold mb-1">{plan.label}</h2>
                <p className="text-2xl font-extrabold">{plan.price}</p>
                <p className="text-white/70 text-xs mt-0.5">{plan.monthlyEq} billed annually</p>
                <p className="text-white/90 text-xs mt-1 font-semibold bg-white/20 rounded-full px-2 py-0.5 inline-block">
                  🎉 {plan.savings}
                </p>
                <div className="mt-5 pt-4 border-t border-white/20">
                  <p className="text-xs font-semibold text-white/80 mb-2">Includes:</p>
                  <ul className="space-y-1.5">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-xs text-white/90">
                        <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Clock className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                  Activated within 1 business day
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Shield className="w-4 h-4 text-green-500 flex-shrink-0" />
                  Secure payment processing
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  Dedicated onboarding support
                </div>
              </div>

              <p className="text-xs text-center text-gray-400 mt-4">
                Want monthly instead?{' '}
                <Link to="/pricing" className="text-indigo-600 hover:underline font-medium">
                  View monthly plans →
                </Link>
              </p>
            </div>

            {/* Right panel */}
            <div className="sm:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

              {/* ── Step 1: Choose payment method ── */}
              {checkoutMode === 'choose' && (
                <div className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-1 text-sm">How would you like to pay?</h3>
                  <p className="text-xs text-gray-400 mb-5">Choose PayPal to pay now and get instant activation, or submit a manual request for bank transfer / wire.</p>

                  {/* PayPal option */}
                  <button
                    onClick={() => {
                      if (!isAuth) { navigate(`/signup?redirect=/annual-plan-request?plan=${planKey}`); return; }
                      setCheckoutMode('paypal');
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-indigo-200 bg-indigo-50 hover:border-indigo-400 hover:bg-indigo-100 transition mb-3 text-left"
                  >
                    <div className="w-10 h-10 bg-[#003087] rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm tracking-tight">PP</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">Pay with PayPal</p>
                      <p className="text-xs text-gray-500">Instant activation · Secure checkout · {plan.price}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Recommended</span>
                    </div>
                  </button>

                  {/* Manual request option */}
                  <button
                    onClick={() => setCheckoutMode('manual')}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 transition text-left"
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">Bank Transfer / Wire / Invoice</p>
                      <p className="text-xs text-gray-400">Submit a request — our team activates within 1 business day</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </button>
                </div>
              )}

              {/* ── Step 2a: PayPal checkout ── */}
              {checkoutMode === 'paypal' && (
                <div>
                  <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-gray-100">
                    <button onClick={() => setCheckoutMode('choose')}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
                      <ArrowRight className="w-4 h-4 rotate-180" />
                    </button>
                    <h3 className="font-semibold text-gray-900 text-sm">PayPal Checkout</h3>
                  </div>
                  <PayPalPayment
                    amount={plan.rawPrice}
                    planName={planKey}
                    billingCycle="yearly"
                    onSuccess={() => setSuccess(true)}
                    onClose={() => setCheckoutMode('choose')}
                  />
                </div>
              )}

              {/* ── Step 2b: Manual request form ── */}
              {checkoutMode === 'manual' && (
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <button onClick={() => setCheckoutMode('choose')}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
                      <ArrowRight className="w-4 h-4 rotate-180" />
                    </button>
                    <h3 className="font-semibold text-gray-900 text-sm">Your Details</h3>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        {error}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
                        <input value={form.name} onChange={set('name')}
                          placeholder="Jane Smith"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Company Name *</label>
                        <input value={form.company} onChange={set('company')}
                          placeholder="Acme LLC"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Email Address *</label>
                        <input type="email" value={form.email} onChange={set('email')}
                          placeholder="you@company.com"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Phone (optional)</label>
                        <input value={form.phone} onChange={set('phone')}
                          placeholder="+1 (555) 000-0000"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Preferred Payment Method</label>
                      <select value={form.paymentMethod} onChange={set('paymentMethod')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white">
                        {MANUAL_PAYMENT_METHODS.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Additional Notes (optional)</label>
                      <textarea value={form.notes} onChange={set('notes')} rows={3}
                        placeholder="Any questions or special requirements..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none" />
                    </div>

                    <button type="submit" disabled={loading}
                      className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm">
                      {loading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                        : <>Submit Request — {plan.price} <ArrowRight className="w-4 h-4" /></>}
                    </button>

                    <p className="text-center text-xs text-gray-400">
                      We'll email you payment instructions within 1 business day.
                    </p>
                  </form>
                </div>
              )}

            </div>

          </div>
        )}
      </div>
    </div>
  );
}
