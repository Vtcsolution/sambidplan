import { useState } from 'react';
import { X, CreditCard, Building2, Clock } from 'lucide-react';
import { adminAPI } from '../services/api';

export default function PlanRequestModal({ isOpen, onClose, selectedPlan, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [paymentMethod, setPaymentMethod] = useState('payoneer');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);

  const PLAN_PRICES = {
    starter:    { monthly: 29,  yearly: 278   },
    pro:        { monthly: 79,  yearly: 758   },
    enterprise: { monthly: 499, yearly: 4788  },
  };
  const getPlanPrice = () => {
    const prices = PLAN_PRICES[selectedPlan];
    if (!prices) return '';
    const amt = billingCycle === 'monthly' ? prices.monthly : prices.yearly;
    return `$${amt.toLocaleString()}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await adminAPI.createPlanRequest({
        requestedPlan: selectedPlan,
        billingCycle,
        paymentMethod,
        notes
      });
      
      if (response.data.success) {
        onSuccess && onSuccess();
        onClose();
        alert('Plan request submitted! Admin will contact you shortly.');
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      setError(error.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Request {selectedPlan?.charAt(0).toUpperCase() + selectedPlan?.slice(1)} Plan</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Billing Cycle</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`flex-1 py-2 px-4 rounded-lg border text-center transition-colors ${
                  billingCycle === 'monthly' 
                    ? 'bg-indigo-600 text-white border-indigo-600' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Clock className="w-4 h-4 mx-auto mb-1" />
                Monthly
                <span className="block text-sm font-bold">{getPlanPrice()}/mo</span>
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`flex-1 py-2 px-4 rounded-lg border text-center transition-colors ${
                  billingCycle === 'yearly' 
                    ? 'bg-indigo-600 text-white border-indigo-600' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Calendar className="w-4 h-4 mx-auto mb-1" />
                Yearly
                <span className="block text-sm font-bold">{getPlanPrice()}/year</span>
              </button>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('payoneer')}
                className={`flex-1 py-2 px-4 rounded-lg border text-center transition-colors ${
                  paymentMethod === 'payoneer' 
                    ? 'bg-indigo-600 text-white border-indigo-600' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <CreditCard className="w-4 h-4 mx-auto mb-1" />
                Payoneer
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('bank_transfer')}
                className={`flex-1 py-2 px-4 rounded-lg border text-center transition-colors ${
                  paymentMethod === 'bank_transfer' 
                    ? 'bg-indigo-600 text-white border-indigo-600' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Building2 className="w-4 h-4 mx-auto mb-1" />
                Bank Transfer
              </button>
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              rows="3"
              placeholder="Any special requests or questions..."
            />
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
          
          <p className="text-xs text-gray-500 text-center mt-4">
            Your request will be reviewed by our team. You will receive an invoice via email.
          </p>
        </form>
      </div>
    </div>
  );
}