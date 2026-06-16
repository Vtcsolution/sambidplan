// Reusable lock screen for plan-gated pages.
// Usage: wrap with useUserPlan hook in the parent page, then render <PlanGate ... /> when plan insufficient.
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Sparkles, Zap, Crown } from 'lucide-react';
import { paymentAPI } from '../services/api';

const PLAN_STYLE = {
  starter: {
    icon:      Zap,
    iconBg:    'bg-blue-50',
    iconColor: 'text-blue-500',
    badge:     'Starter Feature',
    badgeBg:   'bg-blue-100 text-blue-700',
    ctaBg:     'bg-blue-600 hover:bg-blue-700',
    href:      '/pricing',
  },
  pro: {
    icon:      Sparkles,
    iconBg:    'bg-indigo-50',
    iconColor: 'text-indigo-500',
    badge:     'Pro Feature',
    badgeBg:   'bg-indigo-100 text-indigo-700',
    ctaBg:     'bg-indigo-600 hover:bg-indigo-700',
    href:      '/pricing',
  },
  enterprise: {
    icon:      Crown,
    iconBg:    'bg-amber-50',
    iconColor: 'text-amber-500',
    badge:     'Enterprise Feature',
    badgeBg:   'bg-amber-100 text-amber-700',
    ctaBg:     'bg-amber-600 hover:bg-amber-700',
    href:      '/contact',
  },
};

export default function PlanGate({ requiredPlan = 'pro', featureName, description }) {
  const [monthlyPrice, setMonthlyPrice] = useState(null);

  useEffect(() => {
    paymentAPI.getPlans()
      .then(res => {
        const plan = res.data?.data?.find(p => p.name === requiredPlan);
        if (plan?.priceMonthly != null) setMonthlyPrice(plan.priceMonthly);
      })
      .catch(() => {});
  }, [requiredPlan]);

  const c = PLAN_STYLE[requiredPlan] || PLAN_STYLE.pro;
  const Icon = c.icon;

  const planLabel = requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1);

  const ctaText = requiredPlan === 'enterprise'
    ? 'Request Enterprise Access'
    : monthlyPrice != null
      ? `Upgrade to ${planLabel} — $${monthlyPrice}/mo`
      : `Upgrade to ${planLabel}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-5 ${c.badgeBg}`}>
        <Lock className="w-3 h-3" />
        {c.badge}
      </span>

      <div className={`w-20 h-20 ${c.iconBg} rounded-2xl flex items-center justify-center mb-5`}>
        <Icon className={`w-10 h-10 ${c.iconColor}`} />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-3">
        {featureName || 'Upgrade Required'}
      </h2>
      <p className="text-gray-500 max-w-md mb-7 text-sm leading-relaxed">
        {description || `This feature is available on the ${planLabel} plan and above.`}
      </p>

      <Link
        to={c.href}
        className={`inline-flex items-center gap-2 ${c.ctaBg} text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-sm`}
      >
        <Icon className="w-4 h-4" />
        {ctaText}
      </Link>

      {requiredPlan !== 'free' && (
        <Link to="/pricing" className="mt-4 text-sm text-gray-400 hover:text-indigo-500 transition-colors">
          View all plan features →
        </Link>
      )}
    </div>
  );
}
