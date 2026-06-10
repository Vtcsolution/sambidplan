import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { CreditCard, Loader2, AlertCircle, CheckCircle, ShieldCheck, Lock } from 'lucide-react';
import { paymentAPI } from '../services/api';
import notificationSound from '../assets/sounds/admin_notification.mp3';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '15px',
      color: '#111827',
      fontFamily: '"Inter", system-ui, sans-serif',
      '::placeholder': { color: '#9ca3af' },
      iconColor: '#6366f1',
    },
    invalid: {
      color: '#ef4444',
      iconColor: '#ef4444',
    },
  },
};

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

function CardForm({ amount, planName, billingCycle, onSuccess, onClose }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cardComplete, setCardComplete] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [activatedPlan, setActivatedPlan] = useState('');

  const playSound = () => {
    try {
      const audio = new Audio(notificationSound);
      audio.volume = 0.8;
      audio.play().catch(() => {});
    } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError('');

    try {
      // Step 1: Create payment intent on backend
      const intentRes = await paymentAPI.createStripePayment({ planName, billingCycle });
      if (!intentRes.data.success) throw new Error(intentRes.data.message || 'Failed to create payment');

      const { clientSecret, paymentIntentId, invoiceId } = intentRes.data;

      // Step 2: Confirm card payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) },
      });

      if (stripeError) {
        setError(stripeError.message || 'Card payment failed');
        setLoading(false);
        return;
      }

      if (paymentIntent.status !== 'succeeded') {
        setError('Payment not completed. Please try again.');
        setLoading(false);
        return;
      }

      // Step 3: Record the payment and upgrade plan in our DB
      const confirmRes = await paymentAPI.confirmStripePayment({ paymentIntentId, invoiceId });
      if (!confirmRes.data.success) throw new Error(confirmRes.data.message || 'Confirmation failed');

      const activatedPlanName = confirmRes.data.plan || planName;
      playSound();
      localStorage.setItem('userPlan', activatedPlanName);
      sessionStorage.setItem('userPlan', activatedPlanName);
      setActivatedPlan(activatedPlanName);
      setShowToast(true);
      setTimeout(() => {
        onSuccess?.();
        window.location.href = '/opportunities?activated=1';
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showToast && <ActivationToast plan={activatedPlan} />}

      <form onSubmit={handleSubmit} className="p-4">
        {/* Amount summary */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 mb-5 text-center">
          <p className="text-sm text-gray-500 mb-1">You're paying</p>
          <p className="text-3xl font-bold text-indigo-700">
            ${amount}
            <span className="text-base font-normal text-gray-400">/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1 capitalize">{planName} Plan · {billingCycle} billing</p>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 mb-5">
          <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
          Secured by Stripe · 256-bit SSL encryption
        </div>

        {/* Stripe card field */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">Card Details</label>
          <div className="border border-gray-300 rounded-xl px-4 py-3 bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition">
            <CardElement
              options={CARD_ELEMENT_OPTIONS}
              onChange={e => {
                setCardComplete(e.complete);
                if (e.error) setError(e.error.message);
                else setError('');
              }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            Test card: <strong>4242 4242 4242 4242</strong> · any future date · any CVC
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
          type="submit"
          disabled={!stripe || !cardComplete || loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Pay ${amount} securely
            </>
          )}
        </button>

        <p className="text-xs text-center text-gray-400 mt-3 flex items-center justify-center gap-1">
          <CreditCard className="w-3.5 h-3.5" />
          Powered by Stripe · Test mode
        </p>
      </form>
    </>
  );
}

export default function StripePayment(props) {
  return (
    <Elements stripe={stripePromise}>
      <CardForm {...props} />
    </Elements>
  );
}
