import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  LayoutDashboard, FileText, Bell, Settings, LogOut, CreditCard,
  Bookmark, TrendingUp, User, HelpCircle, Shield, Kanban,
  CalendarDays, Sparkles, ScanSearch, ThumbsUp, Truck, Users, BarChart3, Gift, Receipt, FileEdit, Lightbulb, Award, Search, Brain,
  X, ChevronRight, Zap, Building2, FolderOpen
} from 'lucide-react';
import { opportunityAPI } from '../services/api';

// ── What's New content keyed by route path ─────────────────────────────────
const WHATS_NEW = {
  '/ai-predictions': [
    { id: 'pred-1', date: 'Jun 2025', title: 'Win Probability Scoring', desc: 'AI scores each contract 0–100% based on your NAICS codes, past performance history, and competition density.' },
    { id: 'pred-2', date: 'Jun 2025', title: 'Personalized Bid Strategy', desc: 'Get a custom 5-step action plan for each contract — written specifically for your company profile.' },
  ],
  '/proposal-builder': [
    { id: 'prop-1', date: 'Jun 2025', title: 'Full 7-Section Proposals', desc: 'AI now writes complete, submission-ready proposals: Executive Summary, Technical Approach, Management Plan, Past Performance, Price Strategy, and more.' },
    { id: 'prop-2', date: 'Jun 2025', title: 'Agency-Specific Language', desc: 'Proposals auto-include agency evaluation criteria and compliance language for the specific solicitation.' },
  ],
  '/sources-sought': [
    { id: 'ss-1', date: 'Jun 2025', title: 'Pre-RFP Capability Responses', desc: 'Generate compliant responses to Sources Sought / RFIs before the RFP drops — get on the agency\'s radar early.' },
    { id: 'ss-2', date: 'Jun 2025', title: 'Automatic Compliance Check', desc: 'AI flags missing required elements and suggests improvements before you submit.' },
  ],
  '/capability-statement': [
    { id: 'cap-1', date: 'Jun 2025', title: 'AI Capability Statement', desc: 'Full professional statement tailored to your NAICS codes, differentiators, certifications, and target agencies.' },
    { id: 'cap-2', date: 'Jun 2025', title: 'Export Ready', desc: 'Copy formatted text or download for email outreach and pre-solicitation meetings.' },
  ],
  '/rfp-analyzer': [
    { id: 'rfp-1', date: 'Jun 2025', title: 'Deep RFP Breakdown', desc: 'Paste any solicitation and get instant analysis: key requirements, evaluation factors, hidden risks, and a bid recommendation.' },
    { id: 'rfp-2', date: 'Jun 2025', title: 'Auto Compliance Checklist', desc: 'Generates a checklist of every requirement you must address — never miss a mandatory section.' },
  ],
  '/go-no-go': [
    { id: 'gng-1', date: 'Jun 2025', title: 'Go/No-Go Decision Matrix', desc: 'AI evaluates 12 factors — set-aside fit, incumbent presence, agency familiarity — and gives you a clear Bid / Don\'t Bid recommendation.' },
  ],
  '/past-performance': [
    { id: 'pp-1', date: 'Jun 2025', title: 'SF-330 Citation Builder', desc: 'Store past contracts and auto-format them into SF-330 compliant citations ready to paste into any federal proposal.' },
  ],
  '/market-research': [
    { id: 'mr-1', date: 'Jun 2025', title: 'Market Intelligence Dashboard', desc: 'See award trends, top agencies in your NAICS, typical award sizes, and competition density — all in one view.' },
  ],
  '/teaming-finder': [
    { id: 'tf-1', date: 'Jun 2025', title: 'Smart Partner Matching', desc: 'Find companies with complementary capabilities, small business certifications, and proven agency relationships for teaming.' },
  ],
};

const LS_KEY = 'fednotify_seen_updates';

function getSeenIds() {
  try { return new Set(JSON.parse(localStorage.getItem(LS_KEY) || '[]')); }
  catch { return new Set(); }
}

function saveSeenIds(set) {
  localStorage.setItem(LS_KEY, JSON.stringify([...set]));
}

// ── What's New Popover ──────────────────────────────────────────────────────
function WhatsNewPopover({ path, label, onClose, onSeen }) {
  const items = WHATS_NEW[path] || [];
  const ref = useRef(null);

  useEffect(() => {
    onSeen(path);
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [path, onClose, onSeen]);

  return (
    <>
      {/* Mobile: full-screen overlay */}
      <div className="fixed inset-0 bg-black/40 z-[199] md:hidden" onClick={onClose} />
      <div
        ref={ref}
        className={[
          'z-[200] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden',
          // Mobile: centered fixed modal
          'fixed left-4 right-4 top-1/2 -translate-y-1/2 md:static md:translate-y-0',
          // Desktop: popover to the right of the sidebar
          'md:absolute md:left-full md:top-0 md:ml-3 md:w-80',
        ].join(' ')}
        style={{ maxHeight: '80vh', overflowY: 'auto' }}
      >
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-300" />
          <span className="text-white font-semibold text-sm">What's New</span>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Feature label */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide">{label}</p>
      </div>

      {/* Updates list */}
      <div className="px-4 pb-4 space-y-3 mt-1">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3">
            <div className="mt-1 w-2 h-2 rounded-full bg-green-500 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                <span className="text-[10px] text-gray-400 font-medium">{item.date}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="px-4 pb-4">
        <Link
          to={path}
          onClick={onClose}
          className="flex items-center justify-center gap-1.5 w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-sm py-2 rounded-xl transition"
        >
          Open Feature <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
    </>
  );
}

// ── Main Sidebar ────────────────────────────────────────────────────────────
export default function Sidebar({ isOpen, onClose, user, setIsAuthenticated, setUser }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);
  const [seenIds, setSeenIds] = useState(() => getSeenIds());
  const [openPopover, setOpenPopover] = useState(null);

  useEffect(() => {
    if (user?.email) fetchUserProfile();
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const response = await opportunityAPI.getProfile();
      if (response.data.success) setUserProfile(response.data.user);
    } catch {}
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

  const hasUnseen = useCallback((path) => {
    const items = WHATS_NEW[path];
    if (!items) return false;
    return items.some(item => !seenIds.has(item.id));
  }, [seenIds]);

  const markSeen = useCallback((path) => {
    const items = WHATS_NEW[path];
    if (!items) return;
    const updated = new Set(seenIds);
    items.forEach(item => updated.add(item.id));
    setSeenIds(updated);
    saveSeenIds(updated);
  }, [seenIds]);

  const plan = userProfile?.plan || localStorage.getItem('userPlan') || 'free';
  const isPro = ['pro', 'enterprise'].includes(plan);

  const navItems = [
    { path: '/dashboard',     label: 'My Dashboard',         icon: LayoutDashboard, color: 'text-blue-500',    desc: 'Overview & AI predictions' },
    { path: '/opportunities', label: 'Find Contracts',       icon: FileText,        color: 'text-green-500',   desc: 'Browse open federal contracts' },
    { path: '/pipeline',      label: 'Track My Bids',        icon: Kanban,          color: 'text-indigo-500',  desc: 'Manage active proposals' },
    { path: '/calendar',      label: 'Submission Deadlines', icon: CalendarDays,    color: 'text-rose-500',    desc: 'Never miss a due date' },
    { path: '/winning-bids',  label: 'Who Won Contracts',    icon: TrendingUp,      color: 'text-emerald-500', desc: 'Past award intelligence' },
    { path: '/saved',         label: 'Saved Contracts',      icon: Bookmark,        color: 'text-teal-500',    desc: 'Contracts you bookmarked' },
    { path: '/alerts',        label: 'Smart Alerts',         icon: Bell,            color: 'text-yellow-500',  desc: 'Get notified on new matches' },
  ];

  const aiItems = [
    { path: '/ai-predictions',       label: 'AI Contract Predictions',    icon: Brain,      color: 'text-purple-600', pro: true,  desc: 'Win probability & bid strategy' },
    { path: '/proposal-builder',     label: 'Write Full Proposal',        icon: FileEdit,   color: 'text-indigo-500', pro: true,  desc: 'AI-generated full proposal' },
    { path: '/past-performance',     label: 'Past Performance Repo',      icon: Award,      color: 'text-amber-500',  pro: true,  desc: 'Store & export SF-330 citations' },
    { path: '/sources-sought',       label: 'Sources Sought Generator',   icon: Search,     color: 'text-purple-500', pro: true,  desc: 'Respond to RFIs before the RFP drops' },
    { path: '/capability-statement', label: 'Write Capability Statement', icon: Sparkles,   color: 'text-violet-500', pro: true,  desc: 'AI-written company profile' },
    { path: '/rfp-analyzer',         label: 'Analyze a Solicitation',     icon: ScanSearch, color: 'text-blue-500',   pro: true,  desc: 'Break down any RFP/RFQ' },
    { path: '/go-no-go',             label: 'Should I Bid? (Go/No-Go)',   icon: ThumbsUp,   color: 'text-green-500',  pro: true,  desc: 'AI bid decision analysis' },
    { path: '/teaming-finder',       label: 'Find Bid Partners',          icon: Users,      color: 'text-pink-500',   pro: true,  desc: 'Discover teaming companies' },
    { path: '/market-research',      label: 'Market Intelligence',        icon: BarChart3,  color: 'text-purple-500', pro: true,  desc: 'Trends in your NAICS market' },
    { path: '/contract-vehicles',    label: 'Contract Vehicles',          icon: Truck,      color: 'text-orange-500', pro: false, desc: 'GSA schedules & IDIQs' },
    { path: '/referral',             label: 'Earn by Referring',          icon: Gift,       color: 'text-green-500',  pro: false, desc: 'Share & earn commissions' },
  ];

  const companyItems = [
    { path: '/company/profile',   label: 'Company Profile',   icon: Building2,   color: 'text-indigo-500', desc: 'UEI, certs, capabilities' },
    { path: '/company/team',      label: 'Team Members',      icon: Users,       color: 'text-blue-500',   desc: 'Invite & manage your team' },
    { path: '/company/documents', label: 'Document Library',  icon: FolderOpen,  color: 'text-amber-500',  desc: 'Shared proposals & templates' },
  ];

  const accountItems = [
    { path: '/pricing',     label: 'Upgrade My Plan',     icon: CreditCard, color: 'text-purple-500', desc: 'See all plan options' },
    { path: '/billing',     label: 'Billing & Invoices',  icon: Receipt,    color: 'text-indigo-500', desc: 'Download receipts & manage plan' },
    { path: '/settings',    label: 'Account Settings',    icon: Settings,   color: 'text-gray-500',   desc: 'Profile, NAICS, preferences' },
    { path: '/help',        label: 'Help & Support',      icon: HelpCircle, color: 'text-gray-500',   desc: 'FAQs and contact us' },
    { path: '/suggestions', label: 'Suggestions',         icon: Lightbulb,  color: 'text-yellow-500', desc: 'Share ideas & feedback' },
  ];

  const isActive = (path) => location.pathname === path;

  const getPlanDisplayName = () => {
    const p = userProfile?.plan || 'free';
    if (p === 'pro') return 'Pro';
    if (p === 'enterprise') return 'Enterprise';
    if (p === 'starter') return 'Starter';
    return 'Free';
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={onClose} />
      )}

      <aside className={`fixed top-0 left-0 h-full bg-white shadow-xl z-50 w-72 transform transition-transform duration-300 ease-in-out overflow-y-auto ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-5 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" onClick={onClose} className="flex items-center space-x-2">
              <Shield className="w-6 h-6 text-white" />
              <span className="text-xl font-bold text-white">Sambid Notify</span>
            </Link>
            <button onClick={onClose} className="md:hidden text-white hover:text-gray-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-5 pt-4 border-t border-indigo-500/30">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{user?.name || 'User'}</p>
                <p className="text-indigo-200 text-xs truncate">{user?.email || 'user@example.com'}</p>
                <div className="mt-1">
                  <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{getPlanDisplayName()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        {userProfile && (
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600">Matches This Month</span>
              <span className="font-medium text-gray-900">
                {userProfile.monthlyMatchesUsed || 0} / {userProfile.monthlyLimit === 'Unlimited' ? '∞' : userProfile.monthlyLimit || 50}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
              <div
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: userProfile.monthlyLimit !== 'Unlimited'
                    ? `${Math.min(100, ((userProfile.monthlyMatchesUsed || 0) / (userProfile.monthlyLimit || 50)) * 100)}%`
                    : '0%',
                }}
              />
            </div>
            {userProfile.plan === 'free' && (
              <Link to="/pricing" className="text-xs text-indigo-600 hover:underline mt-1 inline-block">Upgrade to Pro →</Link>
            )}
            {userProfile.plan === 'trial' && userProfile.daysLeft > 0 && (
              <p className="text-xs text-orange-600 mt-1">⚠️ {userProfile.daysLeft} days left in trial</p>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="py-4 space-y-1">

          {/* Contracts */}
          <div className="px-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">Contracts</p>
            <div className="space-y-0.5">
              {navItems.map((item) => (
                <Link key={item.path} to={item.path} onClick={onClose}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive(item.path) ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <item.icon className={`w-5 h-5 shrink-0 ${isActive(item.path) ? 'text-indigo-600' : item.color} group-hover:scale-110 transition-transform`} />
                  <span className="flex-1 font-medium text-sm">{item.label}</span>
                  {isActive(item.path) && <div className="w-1 h-6 bg-indigo-600 rounded-full shrink-0" />}
                </Link>
              ))}
            </div>
          </div>

          {/* AI-Powered Tools */}
          <div className="px-3 pt-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">✨ AI-Powered Tools</p>
            <div className="space-y-0.5">
              {aiItems.map((item) => {
                const unseen = hasUnseen(item.path);
                const isPopoverOpen = openPopover === item.path;
                return (
                  <div key={item.path} className="relative">
                    <Link
                      to={item.path}
                      onClick={() => { setOpenPopover(null); if (onClose) onClose(); }}
                      className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive(item.path) ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                      <item.icon className={`w-5 h-5 shrink-0 ${isActive(item.path) ? 'text-indigo-600' : item.color} group-hover:scale-110 transition-transform`} />
                      <span className="flex-1 font-medium text-sm">{item.label}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {item.pro && !isPro && (
                          <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-semibold">Pro</span>
                        )}
                        {unseen && WHATS_NEW[item.path] && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setOpenPopover(isPopoverOpen ? null : item.path);
                            }}
                            className="flex items-center gap-0.5 bg-green-500 hover:bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full transition animate-pulse"
                          >
                            NEW
                          </button>
                        )}
                        {!unseen && WHATS_NEW[item.path] && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setOpenPopover(isPopoverOpen ? null : item.path);
                            }}
                            className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 bg-gray-200 hover:bg-gray-300 text-gray-600 text-[10px] font-semibold px-1.5 py-0.5 rounded-full transition"
                          >
                            <Zap className="w-2.5 h-2.5" /> Info
                          </button>
                        )}
                        {isActive(item.path) && !unseen && <div className="w-1 h-6 bg-indigo-600 rounded-full" />}
                      </div>
                    </Link>

                    {/* Popover */}
                    {isPopoverOpen && (
                      <WhatsNewPopover
                        path={item.path}
                        label={item.label}
                        onClose={() => setOpenPopover(null)}
                        onSeen={markSeen}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Company Workspace */}
          <div className="px-3 pt-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">🏢 Company Workspace</p>
            <div className="space-y-0.5">
              {companyItems.map((item) => (
                <Link key={item.path} to={item.path} onClick={onClose}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive(item.path) ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <item.icon className={`w-5 h-5 shrink-0 ${isActive(item.path) ? 'text-indigo-600' : item.color} group-hover:scale-110 transition-transform`} />
                  <span className="flex-1 font-medium text-sm">{item.label}</span>
                  {isActive(item.path) && <div className="w-1 h-6 bg-indigo-600 rounded-full shrink-0" />}
                </Link>
              ))}
            </div>
          </div>

          {/* My Account */}
          <div className="px-3 pt-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">My Account</p>
            <div className="space-y-0.5">
              {accountItems.map((item) => (
                <Link key={item.path} to={item.path} onClick={onClose}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive(item.path) ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <item.icon className={`w-5 h-5 shrink-0 ${isActive(item.path) ? 'text-indigo-600' : item.color} group-hover:scale-110 transition-transform`} />
                  <span className="flex-1 font-medium text-sm">{item.label}</span>
                  {isActive(item.path) && <div className="w-1 h-6 bg-indigo-600 rounded-full shrink-0" />}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 sticky bottom-0 bg-white">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium text-sm">Logout</span>
          </button>
          <p className="text-center text-xs text-gray-400 mt-3">© 2024 Sambid Notify. All rights reserved.</p>
        </div>
      </aside>
    </>
  );
}
