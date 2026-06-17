// frontend/src/App.jsx
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect, Suspense, lazy } from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from './components/Navbar';

// Deferred layout components — not needed for first paint
const Sidebar       = lazy(() => import('./components/Sidebar'));
const AdminLayout   = lazy(() => import('./pages/admin/AdminLayout'));
const AdminRoute    = lazy(() => import('./pages/admin/AdminRoute'));
const SupportChatbot = lazy(() => import('./components/SupportChatbot'));
const CookieConsent  = lazy(() => import('./components/CookieConsent'));

// ── Lazy-loaded pages (each becomes its own JS chunk) ─────────────────────────
const Home               = lazy(() => import('./pages/home'));
const Signup             = lazy(() => import('./pages/Signup'));
const Login              = lazy(() => import('./pages/Login'));
const Dashboard          = lazy(() => import('./pages/Dashboard'));
const Opportunities      = lazy(() => import('./pages/Opportunities'));
const OpportunityDetail  = lazy(() => import('./pages/OpportunityDetail'));
const SavedOpportunities = lazy(() => import('./pages/SavedOpportunities'));
const Alerts             = lazy(() => import('./pages/Alerts'));
const Pricing            = lazy(() => import('./pages/Pricing'));
const Settings           = lazy(() => import('./pages/Settings'));
const About              = lazy(() => import('./pages/about'));
const Contact            = lazy(() => import('./pages/contact'));
const HowItWorks         = lazy(() => import('./pages/HowItWorks'));
const ForgotPassword     = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword      = lazy(() => import('./pages/ResetPassword'));
const Onboarding         = lazy(() => import('./pages/Onboarding'));
const BidPipeline        = lazy(() => import('./pages/BidPipeline'));
const DeadlineCalendar   = lazy(() => import('./pages/DeadlineCalendar'));
const AdminPayments      = lazy(() => import('./pages/AdminPayments'));
const WinningBidsPage    = lazy(() => import('./pages/WinningBidsPage'));
const Profile            = lazy(() => import('./pages/Profile'));
const Notifications      = lazy(() => import('./pages/Notifications'));
const Help               = lazy(() => import('./pages/Help'));
const SupportLogin       = lazy(() => import('./pages/SupportLogin'));
const SupportDashboard   = lazy(() => import('./pages/SupportDashboard'));
const CapabilityStatement = lazy(() => import('./pages/CapabilityStatement'));
const RFPAnalyzer        = lazy(() => import('./pages/RFPAnalyzer'));
const GoNoGo             = lazy(() => import('./pages/GoNoGo'));
const TeamingFinder      = lazy(() => import('./pages/TeamingFinder'));
const ContractVehicles   = lazy(() => import('./pages/ContractVehicles'));
const MarketResearch     = lazy(() => import('./pages/MarketResearch'));
const ReferralPage       = lazy(() => import('./pages/Referral'));
const VerifyEmail        = lazy(() => import('./pages/VerifyEmail'));
const TermsOfService     = lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy      = lazy(() => import('./pages/PrivacyPolicy'));
const Billing            = lazy(() => import('./pages/Billing'));
const ProposalBuilder    = lazy(() => import('./pages/ProposalBuilder'));
const PayoneerReturn     = lazy(() => import('./pages/PayoneerReturn'));
const Suggestions        = lazy(() => import('./pages/Suggestions'));
const AnnualPlanRequest  = lazy(() => import('./pages/AnnualPlanRequest'));
const PastPerformance    = lazy(() => import('./pages/PastPerformance'));
const SourcesSought      = lazy(() => import('./pages/SourcesSought'));
const AIPredictions      = lazy(() => import('./pages/AIPredictions'));

// Admin pages
const AdminLogin            = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard        = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminPlanRequests     = lazy(() => import('./pages/admin/PlanRequests'));
const AdminPlans            = lazy(() => import('./pages/admin/AdminPlans'));
const AdminNotifications    = lazy(() => import('./pages/admin/AdminNotifications'));
const AdminSettings         = lazy(() => import('./pages/admin/AdminSettings'));
const AdminInvoices         = lazy(() => import('./pages/admin/AdminInvoices'));
const AdminEmailSettings    = lazy(() => import('./pages/admin/AdminEmailSettings'));
const AdminOpportunities    = lazy(() => import('./pages/admin/AdminOpportunities'));
const AdminHybridFetch      = lazy(() => import('./pages/admin/AdminHybridFetch'));
const AdminContactInquiries = lazy(() => import('./pages/admin/AdminContactInquiries'));
const AdminSupportEarnings  = lazy(() => import('./pages/admin/AdminSupportEarnings'));
const AdminMarketingPanel   = lazy(() => import('./pages/admin/AdminMarketingPanel'));
const AdminAIInsights       = lazy(() => import('./pages/admin/AdminAIInsights'));
const AdminUserSegments     = lazy(() => import('./pages/admin/AdminUserSegments'));
const AdminCampaigns        = lazy(() => import('./pages/admin/AdminCampaigns'));
const AdminPlatformHealth   = lazy(() => import('./pages/admin/AdminPlatformHealth'));
const AdminRevenueForecast  = lazy(() => import('./pages/admin/AdminRevenueForecast'));
const AdminContentGenerator = lazy(() => import('./pages/admin/AdminContentGenerator'));
const AdminTickets          = lazy(() => import('./pages/admin/AdminTickets'));
const AdminSuggestions      = lazy(() => import('./pages/admin/AdminSuggestions'));
const AdminUsers            = lazy(() => import('./pages/admin/AdminUsers'));
const AdminAnnualRequests   = lazy(() => import('./pages/admin/AdminAnnualRequests'));
const AdminCreditRequests   = lazy(() => import('./pages/admin/AdminCreditRequests'));
const AdminCompanies        = lazy(() => import('./pages/admin/AdminCompanies'));
const AdminProspects        = lazy(() => import('./pages/admin/AdminProspects'));
const AdminProspectOutreach = lazy(() => import('./pages/admin/AdminProspectOutreach'));
const AdminManagement       = lazy(() => import('./pages/admin/AdminManagement'));
const AdminSupportManagement = lazy(() => import('./pages/admin/AdminSupportManagement'));
const AdminSupportGuide     = lazy(() => import('./pages/admin/AdminSupportGuide'));
const AdminMediaManager        = lazy(() => import('./pages/admin/AdminMediaManager'));
const AdminCompanyWorkspaces   = lazy(() => import('./pages/admin/AdminCompanyWorkspaces'));

const Features          = lazy(() => import('./pages/Features'));
const FAQ               = lazy(() => import('./pages/FAQ'));
const CompanyProfile    = lazy(() => import('./pages/company/CompanyProfile'));
const TeamManagement    = lazy(() => import('./pages/company/TeamManagement'));
const DocumentLibrary   = lazy(() => import('./pages/company/DocumentLibrary'));
const CompanyJoin       = lazy(() => import('./pages/company/CompanyJoin'));

// Eagerly loaded — truly tiny, always visible
import ScrollToTop from './components/ScrollToTop';
import Footer from './components/Footer';

// Minimal spinner shown while lazy chunks load
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function App() {
  const location = useLocation();
  const isProtectedRoute = !['/', '/pricing', '/about', '/how-it-works', '/contact',
    '/signup', '/login', '/forgot-password', '/reset-password', '/terms', '/privacy',
    '/annual-plan-request', '/features', '/faq'].some(p => location.pathname === p || location.pathname.startsWith('/verify-email') || location.pathname.startsWith('/company/join'));
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
  const isAdminRoute   = currentPath.startsWith('/admin');

  // Define routes that should show the sidebar (dashboard pages)
  const sidebarRoutes = [
    '/dashboard', '/opportunities', '/opportunity',
    '/saved', '/alerts', '/winning-bids', '/pipeline', '/calendar',
    '/settings', '/profile', '/notifications', '/help', '/onboarding',
    '/capability-statement', '/rfp-analyzer', '/go-no-go',
    '/teaming-finder', '/contract-vehicles', '/market-research', '/referral', '/billing', '/proposal-builder', '/suggestions', '/past-performance', '/sources-sought', '/ai-predictions',
    '/company'
  ];

  const shouldShowSidebar = isAuthenticated &&
    userRole !== 'admin' &&
    sidebarRoutes.some(route => currentPath.startsWith(route));

  // If admin route, use AdminLayout with protection
  if (isAdminRoute) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* noindex injected in AdminLayout itself */}
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
            <Route path="credit-requests"   element={<AdminCreditRequests />} />
            <Route path="companies"         element={<AdminCompanies />} />
            <Route path="prospects"         element={<AdminProspects />} />
            <Route path="prospect-outreach" element={<AdminProspectOutreach />} />
            <Route path="admin-management"  element={<AdminManagement />} />
            <Route path="my-earnings"       element={<AdminSupportEarnings />} />
            <Route path="earning-guide"     element={<AdminSupportGuide />} />
            <Route path="support-management" element={<AdminSupportManagement />} />
            <Route path="marketing-panel"   element={<AdminMarketingPanel />} />
            <Route path="media-manager"        element={<AdminMediaManager />} />
            <Route path="company-workspaces"   element={<AdminCompanyWorkspaces />} />
          </Route>
        </Routes>
      </Suspense>
    );
  }

  // Regular app layout for non-admin routes
  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Default noindex for all protected/dashboard routes — public pages override this with their own SEOHead */}
      {isProtectedRoute && (
        <Helmet>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
      )}
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
        <Suspense fallback={<PageLoader />}>
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
            <Route path="/features" element={<Features />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/annual-plan-request" element={<AnnualPlanRequest />} />

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

            {/* Company Workspace */}
            <Route path="/company/profile"   element={<CompanyProfile />} />
            <Route path="/company/team"      element={<TeamManagement />} />
            <Route path="/company/documents" element={<DocumentLibrary />} />
            <Route path="/company/join"      element={<CompanyJoin />} />

            {/* Support Portal — separate from admin panel and user dashboard */}
            <Route path="/support/login"     element={<SupportLogin />} />
            <Route path="/support/dashboard" element={<SupportDashboard />} />
          </Routes>
        </Suspense>
      </main>
      {!shouldShowSidebar && !currentPath.startsWith('/support') && <Footer />}
    </div>
  );
}

export default App;
