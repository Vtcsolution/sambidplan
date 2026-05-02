// frontend/src/App.jsx
import { Routes, Route } from 'react-router-dom';
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
import AdminPayments from './pages/AdminPayments';
import WinningBidsPage from './pages/WinningBidsPage';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Help from './pages/Help';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminPlanRequests from './pages/admin/PlanRequests';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminSettings from './pages/admin/AdminSettings';
import AdminInvoices from './pages/admin/AdminInvoices';
import AdminEmailSettings from './pages/admin/AdminEmailSettings';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState(null);

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

  // Get current path
  const currentPath = window.location.pathname;
  const isAdminRoute = currentPath.startsWith('/admin');
  
  // Define routes that should show the sidebar (dashboard pages)
  const sidebarRoutes = [
    '/dashboard', '/opportunities', '/opportunity', 
    '/saved', '/alerts', '/winning-bids', 
    '/settings', '/profile', '/notifications', '/help'
  ];
  
  const shouldShowSidebar = isAuthenticated && 
    userRole !== 'admin' && 
    sidebarRoutes.some(route => currentPath.startsWith(route));

  // If admin route, use AdminLayout with protection
  if (isAdminRoute) {
    console.log('Rendering Admin Layout for path:', currentPath);
    return (
      <Routes>
        <Route path="/admin" element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="plan-requests" element={<AdminPlanRequests />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="invoices" element={<AdminInvoices />} />  {/* ← ADDED */}
          <Route path="email-settings" element={<AdminEmailSettings />} />  {/* ← ADDED */}

        </Route>
      </Routes>
    );
  }

  // Regular app layout for non-admin routes
  console.log('Rendering Regular Layout for path:', currentPath);
  return (
    <div className="min-h-screen bg-gray-50">
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
      <main className={shouldShowSidebar ? 'md:ml-64 transition-all duration-300' : ''}>
        <Routes>
          {/* Public Routes - Always accessible */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} setUser={setUser} />} />
          <Route path="/signup" element={<Signup setIsAuthenticated={setIsAuthenticated} setUser={setUser} />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/pricing" element={<Pricing />} />
          
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
        </Routes>
      </main>
    </div>
  );
}

export default App;