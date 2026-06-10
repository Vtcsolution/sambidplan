// frontend/src/pages/Pricing.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Zap, Shield, Users, CreditCard, X, ArrowRight, Loader2 } from 'lucide-react';
import PaymentModal from '../components/PaymentModal';
import { authAPI, paymentAPI } from '../services/api';

// Yearly prices shown on the pricing page (20% off annual total).
// These match priceYearly in the Plan model — keep in sync.
const YEARLY_SAVINGS_PCT = 20; // displayed as badge on yearly toggle

export default function Pricing() {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [userPlan, setUserPlan] = useState(null);

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      if (token) {
        setIsAuthenticated(true);
        const userEmail = localStorage.getItem('userEmail') || sessionStorage.getItem('userEmail');
        const userName = localStorage.getItem('userName');
        const storedUserPlan = localStorage.getItem('userPlan');
        setUser({ email: userEmail, name: userName });
        setUserPlan(storedUserPlan);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  // Fetch plans from API
  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await paymentAPI.getPlans();
      if (response.data.success) {
        setPlans(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const getPrice = (plan) => {
    if (plan.name === 'free') return 'Free';
    if (billingCycle === 'monthly') return `$${plan.priceMonthly}`;
    return `$${plan.priceYearly.toLocaleString()}`;
  };

  const getPeriodText = (plan) => {
    if (!plan || plan.name === 'free') return '';
    return billingCycle === 'monthly' ? '/month' : '/year';
  };

  // Monthly equivalent shown under yearly price so users can compare easily
  const getMonthlyEquivalent = (plan) => {
    if (plan.name === 'free' || billingCycle === 'monthly') return null;
    const equiv = (plan.priceYearly / 12).toFixed(0);
    return `~$${equiv}/mo`;
  };

  const handleUpgrade = (plan) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (plan.name === 'free') return;

    // All yearly paid plans → Annual Plan Request form (manual activation)
    if (billingCycle === 'yearly') {
      navigate(`/annual-plan-request?plan=${plan.name}`);
      return;
    }

    // Monthly plans → direct PayPal/Stripe payment
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const getButtonStyle = (plan) => {
    if (plan.name === 'free') {
      return 'bg-gray-100 text-gray-700 cursor-default';
    }
    if (plan.popular) {
      return 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg';
    }
    return 'bg-white text-gray-700 border-2 border-gray-200 hover:border-indigo-600 hover:text-indigo-600';
  };

  const getPlanColor = (planName) => {
    switch(planName) {
      case 'free': return 'gray';
      case 'starter': return 'blue';
      case 'pro': return 'indigo';
      case 'enterprise': return 'purple';
      default: return 'gray';
    }
  };

  if (loading || plans.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Sort plans by order
  const sortedPlans = [...plans].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-10 sm:py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-2">
            Choose the plan that fits your business. All plans include access to our federal contract matching engine.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-2 sm:gap-4 mt-6 sm:mt-8 p-1 bg-gray-100 rounded-full">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 sm:px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 sm:px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yearly
              <span className="ml-1 text-xs text-green-600 font-semibold">Save {YEARLY_SAVINGS_PCT}%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {sortedPlans.map((plan) => (
            <div
              key={plan._id}
              className={`relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 ${
                plan.name === 'pro' ? 'ring-2 ring-indigo-500 shadow-md' : ''
              } ${!plan.isActive ? 'opacity-60' : ''}`}
            >
              {plan.name === 'pro' && (
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900">{plan.displayName}</h3>
                <p className="text-gray-500 text-sm mt-1">{plan.description}</p>
                
                <div className="mt-4">
                  <div className="flex items-end gap-1 flex-wrap">
                    <span className="text-4xl font-bold text-gray-900">{getPrice(plan)}</span>
                    {plan.name !== 'free' && (
                      <span className="text-gray-500 mb-1">{getPeriodText(plan)}</span>
                    )}
                  </div>
                  {getMonthlyEquivalent(plan) && (
                    <p className="text-xs text-green-600 font-semibold mt-1">
                      {getMonthlyEquivalent(plan)} · Save {YEARLY_SAVINGS_PCT}%
                    </p>
                  )}
                  {billingCycle === 'monthly' && plan.name !== 'free' && (
                    <p className="text-xs text-gray-400 mt-1">
                      or ${plan.priceYearly.toLocaleString()}/yr (save {YEARLY_SAVINGS_PCT}%)
                    </p>
                  )}
                </div>
                
                {userPlan === plan.name ? (
                  <div className="w-full mt-6 px-4 py-2.5 rounded-lg font-medium text-center bg-green-100 text-green-700">
                    Current Plan
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => handleUpgrade(plan)}
                      className={`w-full mt-6 px-4 py-2.5 rounded-lg font-medium transition-all ${getButtonStyle(plan)}`}
                    >
                      {plan.name === 'free'
                        ? 'Current Plan'
                        : billingCycle === 'yearly'
                          ? `Request ${plan.displayName} Annual`
                          : `Upgrade to ${plan.displayName}`}
                    </button>
                    {billingCycle === 'yearly' && plan.name !== 'free' && (
                      <p className="text-xs text-center text-gray-400 mt-2">
                        Reviewed &amp; activated within 1 business day
                      </p>
                    )}
                  </>
                )}
              </div>
              
              <div className="border-t border-gray-100 p-6">
                <p className="text-sm font-semibold text-gray-900 mb-3">What's included:</p>
                <ul className="space-y-2">
                  {plan.features?.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                      {feature.included ? (
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                      )}
                      <span className={feature.included ? 'text-gray-600' : 'text-gray-400'}>
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        
        {/* Trust Badges */}
        <div className="mt-12 sm:mt-16 text-center">
          <p className="text-sm text-gray-500 mb-4">Trusted by federal contractors nationwide</p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-8 opacity-60">
            {['✓ Secure Payments', '✓ 24/7 Support', '✓ Cancel Anytime', '✓ No Hidden Fees'].map(b => (
              <span key={b} className="text-xs sm:text-sm text-gray-500 font-semibold">{b}</span>
            ))}
          </div>
        </div>
      </div>
      
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        plan={selectedPlan}
        billingCycle={billingCycle}
      />
    </div>
  );
}