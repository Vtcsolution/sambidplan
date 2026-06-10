// Hook to read current admin role and permissions from localStorage
export const useAdminPermission = () => {
  const role        = localStorage.getItem('adminRole')  || 'support';
  const name        = localStorage.getItem('adminName')  || 'Admin';
  const email       = localStorage.getItem('adminEmail') || '';

  const isSuperAdmin = role === 'super_admin';
  const isAdmin      = role === 'admin' || isSuperAdmin;
  const isSupport    = role === 'support' || isAdmin;

  // Permission map per role
  const ROLE_PERMISSIONS = {
    super_admin: { users: true, payments: true, content: true, settings: true, aiTools: true, campaigns: true },
    admin:       { users: true, payments: true, content: true, settings: false, aiTools: true, campaigns: true },
    support:     { users: true, payments: false, content: true, settings: false, aiTools: false, campaigns: false },
  };

  const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.support;

  const can = (permission) => {
    if (isSuperAdmin) return true; // super_admin bypasses all
    return !!permissions[permission];
  };

  // Page-level access rules
  const PAGE_ACCESS = {
    '/admin/dashboard':         ['super_admin', 'admin', 'support'],
    '/admin/platform-health':   ['super_admin', 'admin'],
    '/admin/ai-insights':       ['super_admin', 'admin'],
    '/admin/revenue-forecast':  ['super_admin'],
    '/admin/user-segments':     ['super_admin', 'admin'],
    '/admin/campaigns':         ['super_admin', 'admin'],
    '/admin/content-generator': ['super_admin', 'admin'],
    '/admin/plan-requests':     ['super_admin', 'admin', 'support'],
    '/admin/contact-inquiries': ['super_admin', 'admin', 'support'],
    '/admin/payments':          ['super_admin', 'admin'],
    '/admin/invoices':          ['super_admin', 'admin'],
    '/admin/notifications':     ['super_admin', 'admin', 'support'],
    '/admin/opportunities':     ['super_admin', 'admin'],
    '/admin/settings':          ['super_admin'],
    '/admin/email-settings':    ['super_admin'],
  };

  const canAccessPage = (path) => {
    if (isSuperAdmin) return true;
    const allowed = PAGE_ACCESS[path];
    if (!allowed) return true; // no restriction defined
    return allowed.includes(role);
  };

  return { role, name, email, isSuperAdmin, isAdmin, isSupport, permissions, can, canAccessPage };
};
