import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import {
  Menu, LogOut, ChevronDown, LayoutDashboard, User, X,
  Home, Info, HelpCircle, DollarSign, Phone, Gift
} from 'lucide-react';
import UserNotificationDropdown from './UserNotificationDropdown';

export default function Navbar({ isAuthenticated, setIsAuthenticated, setUser, user, onMenuClick }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  const dashboardRoutes = [
    '/dashboard', '/opportunities', '/opportunity',
    '/saved', '/alerts', '/winning-bids',
    '/settings', '/profile', '/notifications', '/help',
    '/pipeline', '/calendar', '/capability-statement', '/rfp-analyzer',
    '/go-no-go', '/teaming-finder', '/contract-vehicles', '/market-research', '/referral', '/billing', '/proposal-builder', '/past-performance', '/sources-sought'
  ];

  const isDashboardRoute = dashboardRoutes.some(route => location.pathname.startsWith(route));

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
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
    setIsProfileDropdownOpen(false);
    setIsMobileMenuOpen(false);
  };

  const publicLinks = [
    { path: '/',            label: 'Home',         icon: Home },
    { path: '/how-it-works',label: 'How It Works', icon: HelpCircle },
    { path: '/pricing',     label: 'Pricing',      icon: DollarSign },
    { path: '/about',       label: 'About',        icon: Info },
    { path: '/contact',     label: 'Contact',      icon: Phone },
  ];

  const isActive = (path) => location.pathname === path;
  const showPublicNav = !isAuthenticated || !isDashboardRoute;

  return (
    <>
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">

            {/* Left: hamburger (sidebar on dashboard, mobile-only on desktop) + logo */}
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
                /* Mobile hamburger for public nav */
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-lg flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-sm">S</span>
                </div>
                <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent">
                  Sambid
                </span>
              </Link>
            </div>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
              {showPublicNav ? (
                publicLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`text-sm font-medium transition-colors duration-200 ${
                      isActive(link.path)
                        ? 'text-indigo-600 font-semibold'
                        : 'text-gray-600 hover:text-indigo-600'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))
              ) : (
                <span className="text-sm text-gray-400 font-medium">Dashboard</span>
              )}
            </div>

            {/* Right: notifications + auth buttons / profile */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Refer & Earn — shown on all dashboard pages */}
              {isAuthenticated && isDashboardRoute && (
                <>
                  {/* Desktop: large violet pill */}
                  <Link
                    to="/referral"
                    className="refer-earn-btn relative hidden sm:flex items-center gap-2 overflow-hidden bg-violet-100 hover:bg-violet-200 text-violet-700 text-sm font-semibold px-5 py-2.5 rounded-full transition-colors duration-300 select-none"
                    title="Refer a friend and earn balance"
                  >
                    <span className="refer-shine" />
                    <Gift className="refer-icon w-5 h-5 shrink-0 text-violet-600" />
                    <span className="whitespace-nowrap">Refer &amp; earn up to $265</span>
                  </Link>
                  {/* Mobile: compact icon pill */}
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
              {isAuthenticated && isDashboardRoute && (
                <UserNotificationDropdown />
              )}
              {!isAuthenticated ? (
                <>
                  <Link
                    to="/login"
                    className="hidden sm:block text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
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
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center gap-1.5 focus:outline-none group"
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

        {/* Mobile menu — public routes only */}
        {!isDashboardRoute && isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white shadow-lg">
            <div className="px-4 py-3 space-y-1">
              {showPublicNav && publicLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.path)
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <link.icon className="w-4 h-4 shrink-0" />
                  {link.label}
                </Link>
              ))}
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
