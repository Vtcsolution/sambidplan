// frontend/src/App.jsx
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import AdminLayout from './pages/admin/AdminLayout';
import AdminRoute from './pages/admin/AdminRoute';
import Home from './pages/Home';
import Signup from './pages/Signup';
import Login from './pages/Login'
import Dashboard from './pages/Dashboard';
import Opportunities from './pages/Opportunities';
import OpportunityDetail from './pages/OpportunityDetail';
import SavedOpportunities from './pages/SavedOpportunities';
import Alerts from './pages/Alerts';
import Pricing from './pages/Pricing';
import Settings from './pages/Settings';
import About from './pages/About';
import Contact from './pages/Contact';
import HowItWorks from './pages/HowItWorks';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Onboarding from './pages/Onboarding';
import BidPipeline from './pages/BidPipeline';
import DeadlineCalendar from './pages/DeadlineCalendar';
import AdminPayments from './pages/AdminPayments';
import WinningBidsPage from './pages/WinningBidsPage';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Help from './pages/Help';
import AdminOpportunities from './pages/admin/AdminOpportunities';
import AdminHybridFetch   from './pages/admin/AdminHybridFetch';
import AdminContactInquiries from './pages/admin/AdminContactInquiries';
import AdminLogin            from './pages/admin/AdminLogin';
import AdminSupportEarnings  from './pages/admin/AdminSupportEarnings';
import AdminMarketingPanel   from './pages/admin/AdminMarketingPanel';
import BecomePartner         from './pages/BecomePartner';
import AdminAIInsights       from './pages/admin/AdminAIInsights';
import AdminUserSegments     from './pages/admin/AdminUserSegments';
import AdminCampaigns        from './pages/admin/AdminCampaigns';
import AdminPlatformHealth   from './pages/admin/AdminPlatformHealth';
import AdminRevenueForecast  from './pages/admin/AdminRevenueForecast';
import AdminContentGenerator from './pages/admin/AdminContentGenerator';
import SupportChatbot from './components/SupportChatbot';
import CapabilityStatement from './pages/CapabilityStatement';
import RFPAnalyzer from './pages/RFPAnalyzer';
import GoNoGo from './pages/GoNoGo';
import TeamingFinder from './pages/TeamingFinder';
import ContractVehicles from './pages/ContractVehicles';
import MarketResearch from './pages/MarketResearch';
import ReferralPage from './pages/Referral';
import VerifyEmail from './pages/VerifyEmail';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Billing from './pages/Billing';
import ProposalBuilder from './pages/ProposalBuilder';
import PayoneerReturn from './pages/PayoneerReturn';
import Suggestions from './pages/Suggestions';
import AnnualPlanRequest from './pages/AnnualPlanRequest';
import PastPerformance from './pages/PastPerformance';
import SourcesSought from './pages/SourcesSought';
import AIPredictions from './pages/AIPredictions';
import CookieConsent from './components/CookieConsent';
import ScrollToTop from './components/ScrollToTop';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminPlanRequests from './pages/admin/PlanRequests';
import AdminPlans from './pages/admin/AdminPlans';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminSettings from './pages/admin/AdminSettings';
import AdminInvoices from './pages/admin/AdminInvoices';
import AdminEmailSettings from './pages/admin/AdminEmailSettings';
import AdminTickets from './pages/admin/AdminTickets';
import AdminSuggestions from './pages/admin/AdminSuggestions';
import AdminUsers   from './pages/admin/AdminUsers';
import AdminAnnualRequests from './pages/admin/AdminAnnualRequests';
import AdminCreditRequests from './pages/admin/AdminCreditRequests';
import AdminCompanies from './pages/admin/AdminCompanies';
import AdminProspects from './pages/admin/AdminProspects';
import AdminProspectOutreach from './pages/admin/AdminProspectOutreach';
import AdminManagement from './pages/admin/AdminManagement';

function App() {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState(null);

  // Apply the theme for the active panel — admin panel and the user dashboard
  // each have their own dark mode preference, so toggling one doesn't affect
  // the other. Re-runs whenever navigation crosses between panels.
  useEffect(() => {
    const themeKey = location.pathname.startsWith('/admin') ? 'adminTheme' : 'theme';
    const isDark = localStorage.getItem(themeKey) === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
  }, [location.pathname]);

  // Check for existing session on load
  useEffect(() => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    const userEmail = localStorage.getItem('userEmail') || sessionStorage.getItem('userEmail');
    const userName = localStorage.getItem('userName');
    const role = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
    
    console.log('App loaded - User role:', role);
    console.log('App loaded - Token exists:', !!token);
    console.log('App loaded - Current path:', window.location.pathname);
    
    setUserRole(role);
    
    if (token && userEmail) {
      setIsAuthenticated(true);
      setUser({
        email: userEmail,
        name: userName || userEmail.split('@')[0],
        role: role
      });
    }
  }, []);

  // Get current path — use useLocation() so re-renders happen on navigation
  const currentPath = location.pathname;
  const isAdminRoute = currentPath.startsWith('/admin');
  
  // Define routes that should show the sidebar (dashboard pages)
  const sidebarRoutes = [
    '/dashboard', '/opportunities', '/opportunity',
    '/saved', '/alerts', '/winning-bids', '/pipeline', '/calendar',
    '/settings', '/profile', '/notifications', '/help', '/onboarding',
    '/capability-statement', '/rfp-analyzer', '/go-no-go',
    '/teaming-finder', '/contract-vehicles', '/market-research', '/referral', '/billing', '/proposal-builder', '/suggestions', '/past-performance', '/sources-sought', '/ai-predictions'
  ];
  
  const shouldShowSidebar = isAuthenticated && 
    userRole !== 'admin' && 
    sidebarRoutes.some(route => currentPath.startsWith(route));

  // If admin route, use AdminLayout with protection
  if (isAdminRoute) {
    return (
      <Routes>
        {/* Public admin login — no AdminRoute guard */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Protected admin panel */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index                    element={<AdminDashboard />} />
          <Route path="dashboard"         element={<AdminDashboard />} />
          <Route path="plan-requests"     element={<AdminPlanRequests />} />
          <Route path="plans"             element={<AdminPlans />} />
          <Route path="payments"          element={<AdminPayments />} />
          <Route path="notifications"     element={<AdminNotifications />} />
          <Route path="settings"          element={<AdminSettings />} />
          <Route path="invoices"          element={<AdminInvoices />} />
          <Route path="email-settings"    element={<AdminEmailSettings />} />
          <Route path="opportunities"     element={<AdminOpportunities />} />
          <Route path="hybrid-fetch"      element={<AdminHybridFetch />} />
          <Route path="contact-inquiries" element={<AdminContactInquiries />} />
          {/* AI & Automation */}
          <Route path="ai-insights"       element={<AdminAIInsights />} />
          <Route path="user-segments"     element={<AdminUserSegments />} />
          <Route path="campaigns"         element={<AdminCampaigns />} />
          <Route path="platform-health"   element={<AdminPlatformHealth />} />
          <Route path="revenue-forecast"  element={<AdminRevenueForecast />} />
          <Route path="content-generator" element={<AdminContentGenerator />} />
          <Route path="tickets"           element={<AdminTickets />} />
          <Route path="suggestions"       element={<AdminSuggestions />} />
          <Route path="users"             element={<AdminUsers />} />
          <Route path="annual-requests"   element={<AdminAnnualRequests />} />
          <Route path="credit-requests"  element={<AdminCreditRequests />} />
          <Route path="companies"             element={<AdminCompanies />} />
          <Route path="prospects"             element={<AdminProspects />} />
          <Route path="prospect-outreach"     element={<AdminProspectOutreach />} />
          <Route path="admin-management"      element={<AdminManagement />} />
          <Route path="my-earnings"           element={<AdminSupportEarnings />} />
          <Route path="marketing-panel"       element={<AdminMarketingPanel />} />
        </Route>
      </Routes>
    );
  }

  // Regular app layout for non-admin routes
  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <Navbar
        isAuthenticated={isAuthenticated} 
        setIsAuthenticated={setIsAuthenticated}
        setUser={setUser}
        user={user}
        onMenuClick={() => setSidebarOpen(true)}
      />
      
      {/* Sidebar - ONLY shown on dashboard pages, NOT on public pages like Home, About, etc. */}
      {shouldShowSidebar && (
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          user={user}
          setIsAuthenticated={setIsAuthenticated}
          setUser={setUser}
        />
      )}
      
      {/* Main content area - add margin ONLY when sidebar is visible */}
      {/* AI support chatbot — shown on all non-admin pages */}
      <ScrollToTop />
      <SupportChatbot />
      <CookieConsent />

      <main className={shouldShowSidebar ? 'md:ml-72 transition-all duration-300' : ''}>
        <Routes>
          {/* Public Routes - Always accessible */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login setIsAuthenticated={setIsAuthenticated} setUser={setUser} />} />
          <Route path="/signup" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Signup setIsAuthenticated={setIsAuthenticated} setUser={setUser} />} />
          <Route path="/forgot-password" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/annual-plan-request" element={<AnnualPlanRequest />} />
          <Route path="/become-partner"     element={<BecomePartner />} />

          {/* Protected Routes (Dashboard area) */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/opportunities" element={<Opportunities />} />
          <Route path="/opportunity/:id" element={<OpportunityDetail />} />
          <Route path="/saved" element={<SavedOpportunities />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/winning-bids" element={<WinningBidsPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/help" element={<Help />} />
          <Route path="/pipeline"              element={<BidPipeline />} />
          <Route path="/calendar"             element={<DeadlineCalendar />} />
          <Route path="/capability-statement" element={<CapabilityStatement />} />
          <Route path="/rfp-analyzer"         element={<RFPAnalyzer />} />
          <Route path="/go-no-go"             element={<GoNoGo />} />
          <Route path="/teaming-finder"       element={<TeamingFinder />} />
          <Route path="/contract-vehicles"    element={<ContractVehicles />} />
          <Route path="/market-research"      element={<MarketResearch />} />
          <Route path="/referral"             element={<ReferralPage />} />
          <Route path="/billing"              element={<Billing />} />
          <Route path="/proposal-builder"    element={<ProposalBuilder />} />
          <Route path="/terms"               element={<TermsOfService />} />
          <Route path="/privacy"             element={<PrivacyPolicy />} />
          <Route path="/payment/payoneer/return" element={<PayoneerReturn />} />
          <Route path="/suggestions" element={<Suggestions />} />
          <Route path="/past-performance"  element={<PastPerformance />} />
          <Route path="/sources-sought"   element={<SourcesSought />} />
          <Route path="/ai-predictions"   element={<AIPredictions />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;