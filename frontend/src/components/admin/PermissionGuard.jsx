import { useLocation, Navigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAdminPermission } from '../../hooks/useAdminPermission';

// Wrap any admin page — shows "Access Denied" if role lacks permission
export default function PermissionGuard({ permission, children, redirect = false }) {
  const { can, canAccessPage, role } = useAdminPermission();
  const location = useLocation();

  // Check by permission key OR by current page path
  const hasAccess = permission ? can(permission) : canAccessPage(location.pathname);

  if (!hasAccess) {
    if (redirect) return <Navigate to="/admin/dashboard" replace />;
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-10 max-w-md text-center">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-500 text-sm mb-1">
            Your role <span className="font-semibold text-gray-700 capitalize">({role.replace('_', ' ')})</span> does not have permission to access this page.
          </p>
          <p className="text-gray-400 text-xs">Contact your super admin to request access.</p>
          <a href="/admin/dashboard"
            className="inline-block mt-5 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
            ← Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children;
}
