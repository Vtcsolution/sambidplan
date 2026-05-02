// frontend/src/components/PaymentModal.jsx
import { useState } from 'react';
import { X, CreditCard, Building2, AlertCircle, CheckCircle, Lock } from 'lucide-react';
import StripePayment from './StripePayment';
import PayPalPayment from './PayPalPayment';

export default function PaymentModal({ isOpen, onClose, plan, billingCycle }) {
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [success, setSuccess] = useState(false);

  if (!isOpen || !plan) return null;

  const amount = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;

  const handleSuccess = () => {
    setSuccess(true);
    setTimeout(() => {
      onClose();
      window.location.reload();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Complete Your Upgrade</h2>
            <p className="text-sm text-gray-500 mt-1">{plan.name} Plan - {billingCycle === 'monthly' ? 'Monthly' : 'Yearly'} Billing</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {!success ? (
          <>
            {/* Order Summary */}
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">{plan.name} Plan</span>
                  <span className="font-semibold">${amount}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>Billing cycle</span>
                  <span className="capitalize">{billingCycle}</span>
                </div>
                <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between items-center font-semibold">
                  <span>Total</span>
                  <span className="text-indigo-600">${amount} USD</span>
                </div>
              </div>
              
              {/* Payment Method Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Payment Method
                </label>
                <div className="space-y-3">
                  <div 
                    onClick={() => setPaymentMethod('stripe')}
                    className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                      paymentMethod === 'stripe' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Pay with Credit Card (Stripe)</p>
                        <p className="text-xs text-gray-500">Visa, Mastercard, Amex accepted</p>
                      </div>
                      {paymentMethod === 'stripe' && <CheckCircle className="w-5 h-5 text-indigo-600" />}
                    </div>
                  </div>
                  
                  <div 
                    onClick={() => setPaymentMethod('paypal')}
                    className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                      paymentMethod === 'paypal' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Pay with PayPal</p>
                        <p className="text-xs text-gray-500">PayPal balance or credit card</p>
                      </div>
                      {paymentMethod === 'paypal' && <CheckCircle className="w-5 h-5 text-indigo-600" />}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Security Notice */}
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
                <Lock className="w-3 h-3" />
                <span>Secure payment processing by Stripe/PayPal</span>
              </div>
              
              {/* Payment Component */}
              {paymentMethod === 'stripe' ? (
                <StripePayment
                  amount={amount}
                  planName={plan.id}
                  billingCycle={billingCycle}
                  onSuccess={handleSuccess}
                  onClose={onClose}
                />
              ) : (
                <PayPalPayment
                  amount={amount}
                  planName={plan.id}
                  billingCycle={billingCycle}
                  onSuccess={handleSuccess}
                  onClose={onClose}
                />
              )}
              
              <p className="text-xs text-center text-gray-400 mt-4">
                By completing this purchase, you agree to our Terms of Service.
              </p>
            </div>
          </>
        ) : (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Successful!</h3>
            <p className="text-gray-600">
              Your plan has been upgraded to {plan.name}. Redirecting...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}