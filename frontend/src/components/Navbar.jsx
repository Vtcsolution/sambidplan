import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { 
  Menu, 
  LogOut,
  ChevronDown,
  LayoutDashboard,
  User
} from 'lucide-react';

export default function Navbar({ isAuthenticated, setIsAuthenticated, setUser, user, onMenuClick }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Define which routes are dashboard routes (where sidebar should be visible)
  const dashboardRoutes = [
    '/dashboard', '/opportunities', '/opportunity', 
    '/saved', '/alerts', '/winning-bids', 
    '/settings', '/profile', '/notifications', '/help'
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
  };

  // Public links - ALWAYS shown when NOT logged in OR logged in but on public pages
  const publicLinks = [
    { path: '/', label: 'Home' },
    { path: '/how-it-works', label: 'How It Works' },
    { path: '/pricing', label: 'Pricing' },
    { path: '/about', label: 'About' },
    { path: '/contact', label: 'Contact' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Menu Button - Menu button ONLY on dashboard routes */}
          <div className="flex items-center">
            {isAuthenticated && isDashboardRoute && (
              <button
                onClick={onMenuClick}
                className="mr-3 p-2 rounded-lg text-gray-600 hover:bg-gray-100 lg:mr-4"
                aria-label="Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
           <Link to={isAuthenticated && isDashboardRoute ? "/dashboard" : "/"} className="flex items-center space-x-2">
  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-lg flex items-center justify-center shadow-md">
    <span className="text-white font-bold text-sm">S</span>
  </div>
  <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent">
    Sambid
  </span>
</Link>
          </div>

          {/* Desktop Navigation - Public Links ALWAYS shown on public routes */}
          <div className="hidden md:flex items-center space-x-8">
            {/* Show public links if: NOT logged in OR logged in but on public page */}
            {(!isAuthenticated || !isDashboardRoute) ? (
              publicLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-gray-700 hover:text-indigo-600 transition-colors duration-200 ${
                    isActive(link.path) ? 'text-indigo-600 font-semibold' : ''
                  }`}
                >
                  {link.label}
                </Link>
              ))
            ) : (
              // On dashboard routes, show a simple indicator
              <div className="text-gray-500 text-sm">
                Dashboard
              </div>
            )}
          </div>

          {/* Right side buttons */}
          <div className="flex items-center space-x-4">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-indigo-600 transition-colors duration-200"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all duration-200"
                >
                  Sign Up Free
                </Link>
              </>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center space-x-2 focus:outline-none group"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="hidden md:block text-sm text-gray-700">
                    {user?.name?.split(' ')[0] || 'User'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${
                    isProfileDropdownOpen ? 'rotate-180' : ''
                  }`} />
                </button>

                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {user?.name || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user?.email || 'user@example.com'}
                      </p>
                    </div>
                    <Link
                      to="/dashboard"
                      onClick={() => setIsProfileDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                    <Link
                      to="/profile"
                      onClick={() => setIsProfileDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    >
                      <User className="w-4 h-4" />
                      My Profile
                    </Link>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}