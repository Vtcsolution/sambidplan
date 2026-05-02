import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, AlertTriangle, X, Zap } from 'lucide-react';

export default function TrialBanner({ userProfile, onClose }) {
  const [daysLeft, setDaysLeft] = useState(0);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    if (userProfile?.trialEndDate) {
      const endDate = new Date(userProfile.trialEndDate);
      const now = new Date();
      const diff = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      setDaysLeft(Math.max(0, diff));
    }
  }, [userProfile]);

  // Don't show if banner is closed or not trial
  if (!showBanner || userProfile?.plan !== 'trial' || daysLeft <= 0) {
    return null;
  }

  const getBannerStyle = () => {
    if (daysLeft <= 2) {
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        button: 'bg-red-600 hover:bg-red-700',
        icon: 'text-red-500'
      };
    }
    if (daysLeft <= 5) {
      return {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-800',
        button: 'bg-orange-600 hover:bg-orange-700',
        icon: 'text-orange-500'
      };
    }
    return {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      button: 'bg-indigo-600 hover:bg-indigo-700',
      icon: 'text-blue-500'
    };
  };

  const style = getBannerStyle();

  return (
    <div className={`${style.bg} border ${style.border} rounded-lg p-3 mb-3 relative`}>
      <button
        onClick={() => setShowBanner(false)}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
      >
        <X className="w-3 h-3" />
      </button>
      
      <div className="flex items-start gap-2">
        <div className={`${style.icon} mt-0.5`}>
          {daysLeft <= 2 ? (
            <AlertTriangle className="w-4 h-4" />
          ) : (
            <Clock className="w-4 h-4" />
          )}
        </div>
        <div className="flex-1">
          <p className={`text-xs font-semibold ${style.text}`}>
            {daysLeft <= 2 ? '⚠️ Trial ends soon!' : `${daysLeft} days left in trial`}
          </p>
          <p className={`text-xs ${style.text} opacity-80 mt-0.5`}>
            {daysLeft <= 2 
              ? 'Upgrade now to continue.'
              : `Get unlimited matches + AI proposals.`}
          </p>
          <Link
            to="/pricing"
            className={`text-xs font-medium mt-1 inline-block ${style.text} hover:underline`}
          >
            Upgrade Now →
          </Link>
        </div>
      </div>
    </div>
  );
}