import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { paymentAPI } from '../services/api';
import notificationSound from '../assets/sounds/admin_notification.mp3';

export default function PayoneerReturn() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');
  const [plan, setPlan] = useState('');

  useEffect(() => {
    const capture = async () => {
      const payStatus = searchParams.get('status');
      const sessionId = searchParams.get('sessionId');
      const invoiceId = searchParams.get('invoiceId');

      if (payStatus !== 'success') {
        setStatus('error');
        setMessage('Payment was cancelled or failed. No charge was made.');
        return;
      }

      try {
        const res = await paymentAPI.capturePayoneerPayment({ sessionId, invoiceId, status: payStatus });
        if (res.data.success) {
          try {
            const audio = new Audio(notificationSound);
            audio.volume = 0.8;
            audio.play().catch(() => {});
          } catch {}

          const activatedPlan = res.data.plan || 'starter';
          setPlan(activatedPlan);
          localStorage.setItem('userPlan', activatedPlan);
          sessionStorage.setItem('userPlan', activatedPlan);
          setStatus('success');
          setTimeout(() => { window.location.href = '/opportunities?activated=1'; }, 3000);
        } else {
          setStatus('error');
          setMessage(res.data.message || 'Payment capture failed.');
        }
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Something went wrong. Please contact support.');
      }
    };

    capture();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-10 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-14 h-14 text-orange-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800">Confirming your payment…</h2>
            <p className="text-gray-400 text-sm mt-2">Please wait, do not close this page.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful! 🎉</h2>
            <p className="text-gray-500 mb-1">
              Your <strong className="text-indigo-600 capitalize">{plan}</strong> plan is now active.
            </p>
            <p className="text-sm text-gray-400 mb-6">Redirecting to your opportunities…</p>
            <Link
              to="/opportunities?activated=1"
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3 rounded-xl transition"
            >
              Go to Opportunities
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Failed</h2>
            <p className="text-gray-500 mb-6">{message}</p>
            <Link
              to="/pricing"
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3 rounded-xl transition"
            >
              Try Again
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
