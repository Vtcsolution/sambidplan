import { Link } from 'react-router-dom';
import { TrendingUp, Zap, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

export default function UsageStats({ userProfile }) {
  if (!userProfile) return null;

  const { plan, dailyMatchesUsed, dailyLimit, daysLeft, remainingMatches, totalAvailable } = userProfile;
  
  const isTrial = plan === 'trial';
  const isExpired = plan === 'expired';
  const isFree = plan === 'free';
  const isPro = plan === 'pro';
  const isEnterprise = plan === 'enterprise';
  const isUnlimited = dailyLimit === 'Unlimited' || dailyLimit === 'unlimited';
  
  // Calculate percentage for progress bar
  let percentage = 0;
  if (!isUnlimited && typeof dailyLimit === 'number' && dailyLimit > 0) {
    percentage = (dailyMatchesUsed / dailyLimit) * 100;
  }
  
  const getPlanColor = () => {
    if (isTrial) return 'from-orange-500 to-orange-600';
    if (isPro) return 'from-indigo-500 to-indigo-600';
    if (isEnterprise) return 'from-purple-500 to-purple-600';
    if (isFree) return 'from-gray-500 to-gray-600';
    return 'from-gray-500 to-gray-600';
  };

  const getPlanBadgeColor = () => {
    if (isTrial) return 'bg-orange-100 text-orange-700';
    if (isPro) return 'bg-indigo-100 text-indigo-700';
    if (isEnterprise) return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getProgressColor = () => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-orange-500';
    return 'bg-indigo-600';
  };

  const getPlanDisplayName = () => {
    if (isTrial) return 'Free Trial';
    if (isPro) return 'Pro';
    if (isEnterprise) return 'Enterprise';
    if (isExpired) return 'Expired';
    return 'Free';
  };

  return (
    <div className="bg-white rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${getPlanColor()}`} />
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getPlanBadgeColor()}`}>
            {getPlanDisplayName()}
          </span>
        </div>
        {isTrial && daysLeft > 0 && (
          <span className="text-xs text-orange-600 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {daysLeft} days left
          </span>
        )}
      </div>
      
      {/* Daily Matches */}
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-600">Daily Matches</span>
          <span className="font-medium text-gray-900">
            {isUnlimited ? (
              <span className="text-indigo-600 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Unlimited
              </span>
            ) : (
              `${dailyMatchesUsed || 0} / ${dailyLimit || 0}`
            )}
          </span>
        </div>
        {!isUnlimited && typeof dailyLimit === 'number' && dailyLimit > 0 && (
          <>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className={`${getProgressColor()} h-1.5 rounded-full transition-all duration-300`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            {remainingMatches > 0 && totalAvailable > remainingMatches && (
              <p className="text-xs text-gray-500 mt-1">
                {remainingMatches} of {totalAvailable} matches shown
              </p>
            )}
          </>
        )}
      </div>
      
      {/* Upgrade Prompt for Free/Trial/Expired */}
      {(isFree || isTrial || isExpired) && (
        <div className={`mt-2 pt-2 border-t ${isTrial ? 'border-orange-100' : 'border-gray-100'}`}>
          <div className="flex items-center gap-1.5">
            {isTrial ? (
              <AlertTriangle className="w-3 h-3 text-orange-500" />
            ) : (
              <Zap className="w-3 h-3 text-indigo-500" />
            )}
            <p className={`text-xs ${isTrial ? 'text-orange-600' : 'text-indigo-600'}`}>
              {isExpired 
                ? "Trial ended. Upgrade to continue."
                : isTrial 
                  ? `Upgrade for unlimited matches`
                  : "Upgrade to Pro for unlimited matches"}
            </p>
          </div>
          <Link 
            to="/pricing" 
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 mt-1 inline-block"
          >
            View Plans →
          </Link>
        </div>
      )}
      
      {/* Pro/Enterprise benefits */}
      {(isPro || isEnterprise) && (
        <div className="mt-2 pt-2 border-t border-green-100">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3 h-3 text-green-500" />
            <p className="text-xs text-green-600">
              {isPro ? 'Unlimited matches + AI proposals' : 'Enterprise: Real-time alerts + Team access'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}