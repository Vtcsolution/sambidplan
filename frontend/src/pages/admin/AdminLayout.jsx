import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AdminSidebar from '../admin/AdminSidebar';
import AdminHeader  from '../admin/AdminHeader';
import { adminAuthAPI } from '../../services/adminApi';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [admin,       setAdmin]       = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { navigate('/admin/login'); return; }

    // Verify token is still valid — 401 is handled by the adminApi interceptor
    adminAuthAPI.profile()
      .then(res => {
        const a = res.data.admin;
        setAdmin(a);
        localStorage.setItem('adminName',  a.name);
        localStorage.setItem('adminEmail', a.email);
        localStorage.setItem('adminRole',  a.role);
      })
      .catch(() => {
        // Interceptor already handles 401 (clears token + redirects).
        // Only handle non-401 errors here (network down, 500, etc.)
        if (!localStorage.getItem('adminToken')) return; // interceptor already fired
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gray-100 overflow-x-hidden">
      <AdminHeader admin={admin} onMenuClick={() => setSidebarOpen(true)} />
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="lg:pl-72 pt-16 min-w-0">
        <div className="px-3 sm:px-5 lg:px-8 py-5 sm:py-8 min-w-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
