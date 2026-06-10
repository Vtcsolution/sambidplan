// frontend/src/components/PayPalPayment.jsx
import { useRef, useState } from 'react';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { AlertCircle, Loader2, CheckCircle, ShieldCheck } from 'lucide-react';
import { paymentAPI } from '../services/api';
import notificationSound from '../assets/sounds/admin_notification.mp3';

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';

// ── Notification toast ──────────────────────────────────────────────────────
function ActivationToast({ plan, onClose }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center animate-bounce-once border-2 border-green-400">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Plan Activated! 🎉</h2>
        <p className="text-gray-600 mb-2">
          Your <strong className="text-indigo-600 capitalize">{plan}</strong> plan is now active.
        </p>
        <p className="text-sm text-gray-500 mb-5">
          Fetching your latest opportunities now…
        </p>
        <div className="flex items-center justify-center gap-2 text-indigo-600 text-sm font-medium">
          <Loader2 className="w-4 h-4 animate-spin" />
          Redirecting to Opportunities…
        </div>
      </div>
    </div>
  );
}

// ── Loading / error state while PayPal SDK loads ────────────────────────────
function ButtonLoader() {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();

  if (isRejected) return (
    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 text-center">
      PayPal failed to load. Please refresh the page or try a different browser.
    </div>
  );
  if (!isPending) return null;
  return (
    <div className="flex items-center justify-center gap-2 py-5 text-gray-500 text-sm">
      <Loader2 className="w-4 h-4 animate-spin" />
      Loading PayPal…
    </div>
  );
}

// ── Main PayPal Smart Button component ──────────────────────────────────────
function SmartButton({ amount, planName, billingCycle, onSuccess, onError, referralBalanceToApply = 0 }) {
  const invoiceIdRef = useRef(null);

  const createOrder = async () => {
    // Step 1: Ask backend to create a PayPal order + our invoice
    let res;
    try {
      res = await paymentAPI.createPayPalOrder({ planName, billingCycle, referralBalanceToApply });
    } catch (axiosErr) {
      // Surface the exact backend error message
      const msg = axiosErr.response?.data?.message || axiosErr.message || 'Server error creating order';
      console.error('createOrder backend error:', axiosErr.response?.data || axiosErr.message);
      throw new Error(msg);
    }
    if (!res.data.success) throw new Error(res.data.message || 'Failed to create order');
    invoiceIdRef.current = res.data.invoiceId;
    return res.data.orderId;
  };

  const onApprove = async (data) => {
    // Step 2: User approved in PayPal popup — capture + verify on backend
    const res = await paymentAPI.capturePayPalOrder({
      orderId:   data.orderID,
      invoiceId: invoiceIdRef.current
    });

    if (res.data.success) {
      onSuccess(res.data.plan);
    } else {
      onError(res.data.message || 'Payment capture failed');
    }
  };

  return (
    <PayPalButtons
      style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay', height: 48 }}
      fundingSource={undefined}              // show all funding sources (PayPal, card, etc.)
      createOrder={createOrder}
      onApprove={onApprove}
      onError={(err) => {
        const msg = err?.message || '';
        if (msg.includes('Window is closed') || msg.includes('can not determine type')) return;
        console.error('PayPal SDK error:', err);
        onError(msg || 'PayPal encountered an error. Please try again.');
      }}
      onCancel={() => onError('')}           // user cancelled — no error message needed
    />
  );
}

// ── Exported component ───────────────────────────────────────────────────────
export default function PayPalPayment({ amount, planName, billingCycle, onSuccess, onClose, referralBalanceToApply = 0 }) {
  const [error,          setError]        = useState('');
  const [showToast,      setShowToast]    = useState(false);
  const [activatedPlan,  setActivatedPlan] = useState('');

  const playSound = () => {
    try {
      const audio = new Audio(notificationSound);
      audio.volume = 0.8;
      audio.play().catch(() => {}); // browsers may block autoplay — swallow silently
    } catch {}
  };

  const handleSuccess = (plan) => {
    playSound();
    setActivatedPlan(plan || planName);
    setShowToast(true);

    // Update localStorage so App.jsx reflects the new plan
    localStorage.setItem('userPlan', plan || planName);
    sessionStorage.setItem('userPlan', plan || planName);

    // After 3 seconds: close modal + redirect to opportunities (with refresh flag)
    setTimeout(() => {
      onSuccess?.();
      window.location.href = '/opportunities?activated=1';
    }, 3000);
  };

  const handleError = (msg) => {
    if (msg) setError(msg);
  };

  if (!PAYPAL_CLIENT_ID) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
        PayPal is not configured. Please contact support.
      </div>
    );
  }

  return (
    <>
      {showToast && <ActivationToast plan={activatedPlan} onClose={() => setShowToast(false)} />}

      <div className="p-4">
        {/* Amount summary */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-5 text-center">
          <p className="text-sm text-gray-500 mb-1">You're paying</p>
          <p className="text-3xl font-bold text-indigo-700">
            ${Number(amount).toFixed(2)}
            <span className="text-base font-normal text-gray-400">/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1 capitalize">{planName} Plan · {billingCycle} billing</p>
          {referralBalanceToApply > 0 && (
            <p className="text-xs text-green-600 font-medium mt-1">
              Includes ${Number(referralBalanceToApply).toFixed(2)} referral balance applied
            </p>
          )}
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 mb-4">
          <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
          Secured by PayPal · Encrypted payment
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* PayPal Smart Buttons */}
        <PayPalScriptProvider
          key={`${planName}-${billingCycle}-${amount}`}
          options={{
            clientId:   PAYPAL_CLIENT_ID,
            currency:   'USD',
            intent:     'capture',
            components: 'buttons',
          }}
        >
          <ButtonLoader />
          <SmartButton
            amount={amount}
            planName={planName}
            billingCycle={billingCycle}
            onSuccess={handleSuccess}
            onError={handleError}
            referralBalanceToApply={referralBalanceToApply}
          />
        </PayPalScriptProvider>

        <p className="text-xs text-center text-gray-400 mt-4">
          Payment processed securely by PayPal. Sambid Notify never stores your card details.
        </p>
      </div>
    </>
  );
}
