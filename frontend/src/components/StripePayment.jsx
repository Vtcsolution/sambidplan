// frontend/src/components/StripePayment.jsx
import { useState } from 'react';
import { CreditCard, Loader2, AlertCircle } from 'lucide-react';
import { paymentAPI } from '../services/api';

export default function StripePayment({ amount, planName, billingCycle, onSuccess, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSimulatedPayment = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Stripe payment with:', { planName, billingCycle });
      
      const response = await paymentAPI.createStripePayment({
        planName: planName,
        billingCycle: billingCycle
      });
      
      if (response.data.success) {
        const confirmResponse = await paymentAPI.confirmStripePayment({
          paymentIntentId: response.data.paymentIntentId,
          invoiceId: response.data.invoiceId
        });
        
        if (confirmResponse.data.success) {
          alert('✅ Payment successful! Your plan has been upgraded.');
          onSuccess();
          onClose();
        } else {
          setError(confirmResponse.data.message || 'Payment confirmation failed');
        }
      } else {
        setError(response.data.message || 'Failed to create payment');
      }
    } catch (err) {
      console.error('Stripe payment error:', err);
      setError(err.response?.data?.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="text-center mb-6">
        <CreditCard className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
        <h3 className="text-lg font-semibold">Pay with Credit Card</h3>
        <p className="text-sm text-gray-500 mt-1">
          Amount: <span className="font-bold text-gray-900">${amount}</span>
        </p>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      
      {/* Demo Mode Notice */}
      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-700">
          🔧 <strong>Demo Mode:</strong> This is a simulated payment for testing. No real payment will be processed.
        </p>
      </div>
      
      <button
        onClick={handleSimulatedPayment}
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4" />
            Simulate Payment (${amount})
          </>
        )}
      </button>
      
      <p className="text-xs text-gray-500 text-center mt-4">
        Demo mode - No actual payment will be processed. Your plan will be upgraded immediately.
      </p>
    </div>
  );
}