// frontend/src/components/PayoneerPayment.jsx
import { useState } from 'react';
import { Loader2, AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react';
import { paymentAPI } from '../services/api';
import notificationSound from '../assets/sounds/admin_notification.mp3';

function ActivationToast({ plan }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center border-2 border-green-400">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Plan Activated! 🎉</h2>
        <p className="text-gray-600 mb-2">
          Your <strong className="text-indigo-600 capitalize">{plan}</strong> plan is now active.
        </p>
        <p className="text-sm text-gray-500 mb-5">Fetching your latest opportunities now…</p>
        <div className="flex items-center justify-center gap-2 text-indigo-600 text-sm font-medium">
          <Loader2 className="w-4 h-4 animate-spin" />
          Redirecting to Opportunities…
        </div>
      </div>
    </div>
  );
}

export default function PayoneerPayment({ amount, planName, billingCycle, onSuccess, onClose }) {
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [showToast, setShowToast]   = useState(false);
  const [activatedPlan, setActivatedPlan] = useState('');

  const playSound = () => {
    try {
      const audio = new Audio(notificationSound);
      audio.volume = 0.8;
      audio.play().catch(() => {});
    } catch {}
  };

  const handleSuccess = (plan) => {
    playSound();
    setActivatedPlan(plan || planName);
    setShowToast(true);
    localStorage.setItem('userPlan', plan || planName);
    sessionStorage.setItem('userPlan', plan || planName);
    setTimeout(() => {
      onSuccess?.();
      window.location.href = '/opportunities?activated=1';
    }, 3000);
  };

  const handlePayment = async () => {
    if (!planName) {
      setError('Invalid plan selection. Please try again.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Step 1: Create checkout session
      const res = await paymentAPI.createPayoneerSession({ planName, billingCycle });
      if (!res.data.success) throw new Error(res.data.message || 'Failed to create session');

      const { sessionId, checkoutUrl, invoiceId, isMock } = res.data;

      if (isMock) {
        // Sandbox mock: capture immediately without redirect
        const captureRes = await paymentAPI.capturePayoneerPayment({
          sessionId,
          invoiceId,
          status: 'success',
          isMock: true,
        });
        if (captureRes.data.success) {
          handleSuccess(captureRes.data.plan || planName);
        } else {
          throw new Error(captureRes.data.message || 'Payment capture failed');
        }
      } else {
        // Real Payoneer: redirect user to hosted checkout page
        window.location.href = checkoutUrl;
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showToast && <ActivationToast plan={activatedPlan} />}

      <div className="p-4">
        {/* Amount summary */}
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 mb-5 text-center">
          <p className="text-sm text-gray-500 mb-1">You're paying</p>
          <p className="text-3xl font-bold text-orange-700">
            ${amount}
            <span className="text-base font-normal text-gray-400">/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1 capitalize">{planName} Plan · {billingCycle} billing</p>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 mb-4">
          <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
          Secured by Payoneer · Encrypted payment
        </div>

        {/* Sandbox notice */}
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700">
            🔧 <strong>Sandbox Mode:</strong> Payoneer checkout is simulated for testing. No real payment will be processed.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Pay button */}
        <button
          onClick={handlePayment}
          disabled={loading}
          className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing…
            </>
          ) : (
            <>
              {/* Payoneer-style P icon */}
              <span className="w-5 h-5 bg-white text-orange-500 rounded-full flex items-center justify-center font-bold text-xs">P</span>
              Pay ${amount} with Payoneer
            </>
          )}
        </button>

        <p className="text-xs text-center text-gray-400 mt-4">
          Sandbox mode — no actual payment processed. Your plan will be upgraded immediately.
        </p>
      </div>
    </>
  );
}
