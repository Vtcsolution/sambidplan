import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import {
  Menu, LogOut, ChevronDown, LayoutDashboard, User, X,
  Home, Info, DollarSign, Phone, Gift, Zap
} from 'lucide-react';
import UserNotificationDropdown from './UserNotificationDropdown';
import SambidLogo from './SambidLogo';

const featureDemoLinks = [
  { path: '/features/contract-opportunities', label: 'Contract Opportunities', desc: 'Auto-matched SAM.gov contracts' },
  { path: '/features/ai-summarize',           label: 'AI Summarize',           desc: 'Full contract intelligence' },
  { path: '/features/bid-analysis',           label: 'AI Bid Analysis',        desc: 'BID/NO-BID with real data' },
  { path: '/features/proposal-builder',       label: 'AI Proposal Builder',    desc: '7-section proposal writer' },
  { path: '/features/go-no-go',              label: 'Go/No-Go Decision',      desc: '10-factor scoring matrix' },
  { path: '/features/competitive-analysis',   label: 'Competitive Analysis',   desc: 'Real competitor intelligence' },
  { path: '/features/risk-assessment',        label: 'Risk Assessment',        desc: '7-category risk matrix' },
  { path: '/features/managed-service',        label: 'Managed Bidding',        desc: 'We bid for you — pay on win' },
  { path: '/features/deadline-calendar',      label: 'Deadline Calendar',      desc: 'Never miss a due date' },
  { path: '/features/bid-pipeline',           label: 'Bid Pipeline',           desc: 'Track bids through stages' },
];

export default function Navbar({ isAuthenticated, setIsAuthenticated, setUser, user, onMenuClick }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen]           = useState(false);
  const [isFeaturesOpen, setIsFeaturesOpen]               = useState(false);
  const dropdownRef  = useRef(null);
  const featuresRef  = useRef(null);

  const dashboardRoutes = [
    '/dashboard', '/opportunities', '/opportunity',
    '/saved', '/alerts', '/winning-bids',
    '/settings', '/profile', '/notifications', '/help',
    '/pipeline', '/calendar', '/capability-statement', '/rfp-analyzer',
    '/go-no-go', '/teaming-finder', '/contract-vehicles', '/market-research',
    '/referral', '/billing', '/proposal-builder', '/past-performance',
    '/sources-sought', '/ai-predictions', '/suggestions',
  ];

  const isDashboardRoute = dashboardRoutes.some(r => location.pathname.startsWith(r));

  useEffect(() => {
    const handler = e => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setIsProfileDropdownOpen(false);
      if (featuresRef.current && !featuresRef.current.contains(e.target))
        setIsFeaturesOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsFeaturesOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    ['authToken','userEmail','userName','userId','userNAICS','businessName','userPlan','userRole']
      .forEach(k => { localStorage.removeItem(k); sessionStorage.removeItem(k); });
    navigate('/');
    setIsProfileDropdownOpen(false);
    setIsMobileMenuOpen(false);
  };

  const isActive   = path => location.pathname === path;
  const showPublicNav = !isAuthenticated || !isDashboardRoute;

  const topLinks = [
    { path: '/',        label: 'Home',    icon: Home },
    { path: '/pricing', label: 'Pricing', icon: DollarSign },
    { path: '/about',   label: 'About',   icon: Info },
    { path: '/contact', label: 'Contact', icon: Phone },
  ];

  return (
    <>
      <nav className="bg-white shadow-md">
        <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${isDashboardRoute && isAuthenticated ? '' : 'max-w-[1440px]'}`}>
          <div className="flex justify-between items-center h-16">

            {/* Left — hamburger + logo */}
            <div className="flex items-center gap-2">
              {isAuthenticated && isDashboardRoute ? (
                <button
                  onClick={onMenuClick}
                  className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                  aria-label="Open sidebar"
                >
                  <Menu className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={() => setIsMobileMenuOpen(o => !o)}
                  className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                  aria-label="Toggle menu"
                >
                  {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              )}

              <Link
                to={isAuthenticated && isDashboardRoute ? '/dashboard' : '/'}
                className="flex items-center gap-2"
              >
                <SambidLogo size={32} />
                <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent">
                  Sambid
                </span>
              </Link>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {showPublicNav && (
                <>
                  {/* Home */}
                  <Link
                    to="/"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/') ? 'text-indigo-600 bg-indigo-50' : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
                    }`}
                  >
                    Home
                  </Link>

                  {/* Features dropdown */}
                  <div className="relative" ref={featuresRef}>
                    <button
                      onClick={() => { setIsFeaturesOpen(o => !o); setIsPlatformOpen(false); }}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isFeaturesOpen || location.pathname.startsWith('/features')
                          ? 'text-indigo-600 bg-indigo-50'
                          : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
                      }`}
                    >
                      Features
                      <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${isFeaturesOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isFeaturesOpen && (
                      <div className="absolute left-0 top-full mt-2 w-[520px] bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-50">
                        <div className="grid grid-cols-2 gap-1">
                          {featureDemoLinks.map(l => (
                            <Link key={l.path} to={l.path} onClick={() => setIsFeaturesOpen(false)}
                              className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-indigo-50 transition-colors">
                              <Zap className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{l.label}</p>
                                <p className="text-xs text-gray-500">{l.desc}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                        <div className="border-t border-gray-100 mt-3 pt-3 flex items-center justify-between">
                          <Link to="/features" onClick={() => setIsFeaturesOpen(false)}
                            className="text-sm text-indigo-600 font-semibold hover:underline">
                            View All Features →
                          </Link>
                          <span className="text-xs text-gray-400">18 features available</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* How It Works — animated standalone button */}
                  <Link
                    to="/how-it-works"
                    onClick={() => setIsFeaturesOpen(false)}
                    className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      isActive('/how-it-works')
                        ? 'bg-indigo-700 text-white shadow-lg shadow-indigo-200'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'
                    }`}
                  >
                    How It Works
                    {!isActive('/how-it-works') && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                      </span>
                    )}
                  </Link>

                  {/* Other links */}
                  {topLinks.slice(1).map(link => (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive(link.path)
                          ? 'text-indigo-600 bg-indigo-50'
                          : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </>
              )}

              {!showPublicNav && (
                <span className="text-sm text-gray-400 font-medium">Dashboard</span>
              )}
            </div>

            {/* Right — auth + notifications */}
            <div className="flex items-center gap-1 sm:gap-2">
              {isAuthenticated && isDashboardRoute && (
                <>
                  <Link
                    to="/referral"
                    className="refer-earn-btn relative hidden sm:flex items-center gap-2 overflow-hidden bg-violet-100 hover:bg-violet-200 text-violet-700 text-sm font-semibold px-5 py-2.5 rounded-full transition-colors duration-300 select-none"
                    title="Refer a friend and earn balance"
                  >
                    <span className="refer-shine" />
                    <Gift className="refer-icon w-5 h-5 shrink-0 text-violet-600" />
                    <span className="whitespace-nowrap">Refer &amp; earn up to $265</span>
                  </Link>
                  <Link
                    to="/referral"
                    className="refer-earn-btn relative sm:hidden flex items-center gap-1.5 overflow-hidden bg-violet-100 hover:bg-violet-200 text-violet-700 text-xs font-semibold px-3 py-2 rounded-full transition-colors duration-300 select-none"
                    title="Refer & earn up to $265"
                  >
                    <span className="refer-shine" />
                    <Gift className="refer-icon w-4 h-4 shrink-0 text-violet-600" />
                    <span className="whitespace-nowrap">Refer</span>
                  </Link>
                </>
              )}

              {isAuthenticated && isDashboardRoute && <UserNotificationDropdown />}

              {!isAuthenticated ? (
                <>
                  <Link
                    to="/login"
                    className="hidden sm:block text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors px-3 py-2"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="bg-indigo-600 text-white text-sm font-semibold px-3 py-2 sm:px-4 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
                  >
                    Sign Up Free
                  </Link>
                </>
              ) : (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsProfileDropdownOpen(o => !o)}
                    className="flex items-center gap-1.5 focus:outline-none"
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0">
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span className="hidden sm:block text-sm text-gray-700 max-w-[100px] truncate">
                      {user?.name?.split(' ')[0] || 'User'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50">
                      <div className="px-4 py-2.5 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'User'}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      </div>
                      <Link
                        to="/dashboard"
                        onClick={() => setIsProfileDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 shrink-0" />
                        Dashboard
                      </Link>
                      <Link
                        to="/profile"
                        onClick={() => setIsProfileDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                      >
                        <User className="w-4 h-4 shrink-0" />
                        My Profile
                      </Link>
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4 shrink-0" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {!isDashboardRoute && isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white shadow-lg">
            <div className="px-4 py-3 space-y-1">
              {showPublicNav && (
                <>
                  {/* Home */}
                  <Link
                    to="/"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/') ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Home className="w-4 h-4 shrink-0" />
                    Home
                  </Link>

                  {/* Features section */}
                  <div className="px-3 pt-2 pb-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Features</p>
                  </div>
                  <Link to="/features" onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('/features') ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-50'}`}>
                    <Zap className="w-4 h-4 shrink-0 text-indigo-500" /> All Features
                  </Link>
                  {featureDemoLinks.slice(0, 5).map(l => (
                    <Link key={l.path} to={l.path} onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                      <Zap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      {l.label}
                    </Link>
                  ))}
                  <Link to="/features" onClick={() => setIsMobileMenuOpen(false)}
                    className="px-3 py-2 text-xs text-indigo-600 font-semibold hover:underline">
                    View all 18 features →
                  </Link>

                  {/* How It Works */}
                  <Link
                    to="/how-it-works"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${isActive('/how-it-works') ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white'}`}
                  >
                    How It Works
                  </Link>

                  {/* Rest */}
                  <div className="px-3 pt-2 pb-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Company</p>
                  </div>
                  {topLinks.slice(1).map(link => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                        isActive(link.path) ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <link.icon className="w-4 h-4 shrink-0" />
                      {link.label}
                    </Link>
                  ))}
                </>
              )}

              {!isAuthenticated && (
                <div className="pt-2 border-t border-gray-100 flex flex-col gap-2 mt-2">
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Sign Up Free
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
