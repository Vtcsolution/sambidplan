// frontend/src/components/admin/AdminSidebar.jsx
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Settings, 
  LogOut,
  Bell,
  Shield,
  Home,
  FileText,
  Mail
} from 'lucide-react';

export default function AdminSidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/plan-requests', label: 'Plan Requests', icon: Users },
    { path: '/admin/payments', label: 'Payments', icon: CreditCard },
    { path: '/admin/invoices', label: 'Invoices', icon: CreditCard },  // ← ADDED
    { path: '/admin/notifications', label: 'Notifications', icon: Bell },
    { path: '/admin/settings', label: 'Settings', icon: Settings },
    { path: '/admin/email-settings', label: 'Email Settings', icon: Mail },

  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('userName');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('userId');
    navigate('/login');
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={`fixed top-0 left-0 h-full bg-gradient-to-b from-indigo-900 to-indigo-800 shadow-xl z-50 w-72 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-indigo-700">
          <Link to="/admin/dashboard" className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-indigo-300" />
            <div>
              <h1 className="text-xl font-bold text-white">Sambid</h1>
              <p className="text-xs text-indigo-300">Admin Panel</p>
            </div>
          </Link>
        </div>
        
        {/* Menu Items */}
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => onClose && onClose()}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive(item.path)
                  ? 'bg-indigo-700 text-white shadow-lg'
                  : 'text-indigo-200 hover:bg-indigo-700/50 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
              {isActive(item.path) && (
                <div className="ml-auto w-1 h-6 bg-white rounded-full" />
              )}
            </Link>
          ))}
        </nav>
        
        {/* Divider */}
        <div className="mx-4 my-4 border-t border-indigo-700" />
        
        {/* Bottom Links */}
        <nav className="p-4 space-y-1">
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-300 hover:bg-red-900/30 hover:text-red-200 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </nav>
        
        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
          <p className="text-xs text-indigo-400">
            © 2024 Sambid. All rights reserved.
          </p>
        </div>
      </aside>
    </>
  );
}