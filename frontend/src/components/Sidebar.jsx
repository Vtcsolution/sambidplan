import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Bell, 
  Settings, 
  LogOut,
  CreditCard,
  Bookmark,
  TrendingUp,
  User,
  HelpCircle,
  Shield
} from 'lucide-react';
import { opportunityAPI } from '../services/api';

export default function Sidebar({ isOpen, onClose, user, setIsAuthenticated, setUser }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    if (user?.email) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const response = await opportunityAPI.getProfile();
      if (response.data.success) {
        setUserProfile(response.data.user);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setUserProfile(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    localStorage.removeItem('userNAICS');
    localStorage.removeItem('businessName');
    localStorage.removeItem('userPlan');
    localStorage.removeItem('userRole');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userEmail');
    navigate('/');
    if (onClose) onClose();
  };

  // ONLY Dashboard Navigation Items - NO public pages
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-500' },
    { path: '/opportunities', label: 'Opportunities', icon: FileText, color: 'text-green-500' },
    { path: '/winning-bids', label: 'Winning Bids', icon: TrendingUp, color: 'text-emerald-500' },
    { path: '/saved', label: 'Saved', icon: Bookmark, color: 'text-teal-500' },
    { path: '/alerts', label: 'Alerts', icon: Bell, color: 'text-yellow-500' },
    { path: '/pricing', label: 'Pricing', icon: CreditCard, color: 'text-purple-500' },
    { path: '/settings', label: 'Settings', icon: Settings, color: 'text-gray-500' },
    { path: '/help', label: 'Help & Support', icon: HelpCircle, color: 'text-gray-500' },
  ];

  const isActive = (path) => location.pathname === path;

  const getPlanDisplayName = () => {
    const plan = userProfile?.plan || 'free';
    if (plan === 'pro') return 'Pro';
    if (plan === 'enterprise') return 'Enterprise';
    if (plan === 'starter') return 'Starter';
    return 'Free';
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={`fixed top-0 left-0 h-full bg-white shadow-xl z-50 w-72 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        {/* Header with User Info */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-5 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" onClick={onClose} className="flex items-center space-x-2">
              <Shield className="w-6 h-6 text-white" />
              <span className="text-xl font-bold text-white">FedVantage</span>
            </Link>
            <button
              onClick={onClose}
              className="md:hidden text-white hover:text-gray-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* User Info */}
          <div className="mt-5 pt-4 border-t border-indigo-500/30">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{user?.name || 'User'}</p>
                <p className="text-indigo-200 text-xs truncate">{user?.email || 'user@example.com'}</p>
                <div className="mt-1">
                  <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                    {getPlanDisplayName()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Quick Stats */}
        {userProfile && (
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600">Daily Matches Used</span>
              <span className="font-medium text-gray-900">
                {userProfile.dailyMatchesUsed || 0} / {userProfile.dailyLimit === 'Unlimited' ? '∞' : userProfile.dailyLimit || 2}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
              <div 
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                style={{ 
                  width: userProfile.dailyLimit !== 'Unlimited' 
                    ? `${((userProfile.dailyMatchesUsed || 0) / (userProfile.dailyLimit || 2)) * 100}%` 
                    : '0%' 
                }}
              />
            </div>
            {userProfile.plan === 'free' && (
              <Link to="/pricing" className="text-xs text-indigo-600 hover:underline mt-1 inline-block">
                Upgrade to Pro →
              </Link>
            )}
            {userProfile.plan === 'trial' && userProfile.daysLeft > 0 && (
              <p className="text-xs text-orange-600 mt-1">
                ⚠️ {userProfile.daysLeft} days left in trial
              </p>
            )}
          </div>
        )}
        
        {/* Navigation - Only Dashboard Items */}
        <nav className="py-4">
          <div className="px-3">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
              Menu
            </div>
            <div className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                    isActive(item.path)
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive(item.path) ? 'text-indigo-600' : item.color} group-hover:scale-110 transition-transform`} />
                  <span className="font-medium text-sm">{item.label}</span>
                  {isActive(item.path) && (
                    <div className="ml-auto w-1 h-6 bg-indigo-600 rounded-full" />
                  )}
                </Link>
              ))}
            </div>
          </div>
        </nav>
        
        {/* Footer with Logout */}
        <div className="p-4 border-t border-gray-200 sticky bottom-0 bg-white">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium text-sm">Logout</span>
          </button>
          <p className="text-center text-xs text-gray-400 mt-3">
            © 2024 FedVantage. All rights reserved.
          </p>
        </div>
      </aside>
    </>
  );
}