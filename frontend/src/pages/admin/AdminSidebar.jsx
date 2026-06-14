import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, CreditCard, Settings, LogOut, Bell,
  Shield, ShieldCheck, FileText, Mail, MessageSquare, Sparkles, BarChart3,
  TrendingUp, Activity, Send, Cpu, DollarSign, UserCheck, Heart, Layers, Ticket, Lightbulb, Building2, Zap, Wallet
} from 'lucide-react';
import { useAdminPermission } from '../../hooks/useAdminPermission';
import { adminPanelAPI } from '../../services/adminApi';

const ALL_NAV = [
  {
    section: 'Overview',
    items: [
      { path: '/admin/dashboard',         label: 'Dashboard',         icon: LayoutDashboard, roles: ['super_admin','admin','support'] },
      { path: '/admin/platform-health',   label: 'Platform Health',   icon: Activity,        roles: ['super_admin','admin'] },
    ],
  },
  {
    section: 'AI & Automation',
    items: [
      { path: '/admin/ai-insights',       label: 'AI Insights',        icon: Sparkles,   roles: ['super_admin','admin'] },
      { path: '/admin/revenue-forecast',  label: 'Revenue Forecast',   icon: TrendingUp, roles: ['super_admin'] },
      { path: '/admin/user-segments',     label: 'User Segments',      icon: UserCheck,  roles: ['super_admin','admin'] },
      { path: '/admin/campaigns',         label: 'Email Campaigns',    icon: Send,       roles: ['super_admin','admin'] },
      { path: '/admin/content-generator', label: 'Content Generator',  icon: Cpu,        roles: ['super_admin','admin'] },
    ],
  },
  {
    section: 'Users & Plans',
    items: [
      { path: '/admin/users',             label: 'All Users',         icon: Users,       roles: ['super_admin','admin'] },
      { path: '/admin/plans',              label: 'Plan Pricing',      icon: DollarSign,  roles: ['super_admin','admin'] },
      { path: '/admin/plan-requests',     label: 'Plan Requests',     icon: Layers,      roles: ['super_admin','admin'] },
      { path: '/admin/annual-requests',   label: 'Annual Requests',   icon: UserCheck,   roles: ['super_admin','admin','support'] },
      { path: '/admin/credit-requests',  label: 'Credit Requests',   icon: Zap,         roles: ['super_admin','admin'] },
      { path: '/admin/contact-inquiries', label: 'Contact Inquiries', icon: MessageSquare,roles: ['super_admin','admin','support'] },
      { path: '/admin/tickets',           label: 'Support Tickets',   icon: Ticket,      roles: ['super_admin','admin','support'] },
      { path: '/admin/suggestions',       label: 'Suggestions',        icon: Lightbulb,   roles: ['super_admin','admin','support'] },
      { path: '/admin/payments',          label: 'Payments',          icon: CreditCard,  roles: ['super_admin','admin'] },
      { path: '/admin/invoices',          label: 'Invoices',          icon: FileText,    roles: ['super_admin','admin'] },
    ],
  },
  {
    section: 'Prospect Database',
    items: [
      { path: '/admin/prospects',          label: 'Federal Prospects', icon: Users,     roles: ['super_admin','admin','support'] },
      { path: '/admin/prospect-outreach',  label: 'Email Outreach',    icon: Send,      roles: ['super_admin','admin','support'] },
      { path: '/admin/companies',          label: 'SAM Companies',     icon: Building2, roles: ['super_admin','admin'] },
    ],
  },
  {
    section: 'My Earnings',
    items: [
      { path: '/admin/my-earnings', label: 'Referral Earnings', icon: Wallet, roles: ['support'] },
    ],
  },
  {
    section: 'System',
    items: [
      { path: '/admin/notifications',     label: 'Notifications',     icon: Bell,        roles: ['super_admin','admin','support'] },
      { path: '/admin/opportunities',     label: 'Opportunities',     icon: FileText,    roles: ['super_admin','admin'] },
      { path: '/admin/hybrid-fetch',      label: 'Hybrid Pipeline',   icon: Layers,      roles: ['super_admin'] },
      { path: '/admin/marketing-panel',    label: 'Marketing Panel',   icon: TrendingUp,  roles: ['super_admin'] },
      { path: '/admin/admin-management',  label: 'Admin Accounts',    icon: ShieldCheck, roles: ['super_admin'] },
      { path: '/admin/settings',          label: 'Settings',          icon: Settings,    roles: ['super_admin'] },
      { path: '/admin/email-settings',    label: 'Email Settings',    icon: Mail,        roles: ['super_admin'] },
    ],
  },
];

// Map sidebar path → which key in pendingCounts to use for the badge
const BADGE_KEY = {
  '/admin/plan-requests':     'planRequests',
  '/admin/annual-requests':   'annualRequests',
  '/admin/credit-requests':   'creditRequests',
  '/admin/contact-inquiries': 'contactInquiries',
  '/admin/tickets':           'tickets',
  '/admin/suggestions':       'suggestions',
  '/admin/notifications':     'notifications',
};

export default function AdminSidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate  = useNavigate();
  const { role: adminRole, name: adminName, email: adminEmail, canAccessPage } = useAdminPermission();
  const [counts, setCounts] = useState({});

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await adminPanelAPI.getPendingCounts();
        if (res.data.success) setCounts(res.data.data);
      } catch {}
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter nav sections based on current admin role
  const NAV = ALL_NAV.map(group => ({
    ...group,
    items: group.items.filter(item => item.roles.includes(adminRole)),
  })).filter(group => group.items.length > 0);

  const handleLogout = () => {
    ['adminToken', 'adminName', 'adminEmail', 'adminRole'].forEach(k => localStorage.removeItem(k));
    navigate('/admin/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside className={`fixed top-0 left-0 h-full bg-gradient-to-b from-indigo-900 to-indigo-800 shadow-xl z-50 w-72 flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>

        {/* Logo */}
        <div className="p-5 border-b border-indigo-700 shrink-0">
          <Link to="/admin/dashboard" className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Sambid Notify</h1>
              <p className="text-xs text-indigo-300">Admin Panel</p>
            </div>
          </Link>
          {/* Admin info */}
          <div className="mt-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {adminName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{adminName}</p>
              <p className="text-xs text-indigo-300 capitalize">{adminRole.replace('_', ' ')}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-1">
          {NAV.map(group => (
            <div key={group.section} className="px-3 mb-2">
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider px-3 mb-1.5">{group.section}</p>
              {group.items.map(item => {
                const badgeKey = BADGE_KEY[item.path];
                const badgeCount = badgeKey ? (counts[badgeKey] || 0) : 0;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 mb-0.5 ${
                      isActive(item.path)
                        ? 'bg-white/15 text-white shadow-sm'
                        : 'text-indigo-200 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium flex-1">{item.label}</span>
                    {badgeCount > 0 && (
                      <span className="ml-auto min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                    {isActive(item.path) && badgeCount === 0 && (
                      <div className="ml-auto w-1 h-5 bg-white rounded-full" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-indigo-700 shrink-0 space-y-2">
          <a href="/" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 text-indigo-300 hover:text-white hover:bg-white/10 rounded-lg transition text-sm">
            <Heart className="w-4 h-4" /> View Live Site
          </a>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-red-300 hover:bg-red-900/30 hover:text-red-200 rounded-lg transition text-sm">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}
