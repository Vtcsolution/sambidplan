// frontend/src/pages/admin/AdminLayout.jsx
import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AdminSidebar from '../admin/AdminSidebar';
import AdminHeader from '../admin/AdminHeader';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [admin, setAdmin] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('=== AdminLayout Initialized ===');
    
    // Check if user is admin
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    const userRole = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
    const userName = localStorage.getItem('userName');
    const userEmail = localStorage.getItem('userEmail');
    
    console.log('Token exists:', !!token);
    console.log('User Role:', userRole);
    console.log('User Email:', userEmail);
    console.log('User Name:', userName);
    
    if (!token) {
      console.log('No token, redirecting to login');
      navigate('/login');
      return;
    }
    
    if (userRole !== 'admin') {
      console.log(`Not admin (role: ${userRole}), redirecting to dashboard`);
      navigate('/dashboard');
      return;
    }
    
    console.log('Admin verified, showing admin panel');
    setAdmin({ name: userName, email: userEmail });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminHeader 
        admin={admin} 
        onMenuClick={() => setSidebarOpen(true)} 
      />
      <AdminSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
      
      {/* Main Content */}
      <main className="lg:pl-64 pt-16">
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}