// frontend/src/components/UpgradeModal.jsx
import { useState } from 'react';
import { X, Check, CreditCard, Loader2 } from 'lucide-react';
import { paymentAPI } from '../services/api';
import Button from './Button';

export default function UpgradeModal({ plan, onClose, onSuccess }) {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await paymentAPI.createInvoice({
        planName: plan.name,
        billingCycle
      });
      
      if (response.data.success) {
        alert('Invoice sent to your email! Please check your inbox and complete payment via Payoneer.\n\nAfter payment, your account will be upgraded within 24 hours.');
        onSuccess?.();
        onClose();
      }
    } catch (err) {
      console.error('Upgrade error:', err);
      setError(err.response?.data?.message || 'Failed to create invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
  const yearlySavings = billingCycle === 'yearly' 
    ? ((plan.priceMonthly * 12) - plan.priceYearly).toFixed(2)
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Upgrade to {plan.displayName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          {/* Billing Toggle */}
          <div className="bg-gray-100 rounded-lg p-1 flex mb-6">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                billingCycle === 'monthly' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                billingCycle === 'yearly' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yearly (Save 20%)
            </button>
          </div>
          
          {/* Price */}
          <div className="text-center mb-6">
            <span className="text-4xl font-bold text-gray-900">${price}</span>
            <span className="text-gray-600">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
            {yearlySavings > 0 && (
              <p className="text-sm text-green-600 mt-1">Save ${yearlySavings}/year</p>
            )}
          </div>
          
          {/* Features */}
          <div className="space-y-3 mb-6">
            <p className="font-semibold text-gray-900">What's included:</p>
            {plan.features.filter(f => f.included).slice(0, 8).map((feature, idx) => (
              <div key={idx} className="flex items-center text-sm">
                <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-gray-700">{feature.name}</span>
              </div>
            ))}
          </div>
          
          {/* Payment Info */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Payment via Payoneer</p>
                <p className="text-xs text-blue-600 mt-1">
                  You'll receive an invoice via email. After payment, your account will be upgraded within 24 hours.
                </p>
              </div>
            </div>
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}
          
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Invoice...
              </>
            ) : (
              `Upgrade to ${plan.displayName}`
            )}
          </button>
          
          <p className="text-xs text-gray-500 text-center mt-4">
            No long-term contract. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}