// Hook to read current admin role and permissions from localStorage.
// Individual permissions (set per-account by super admin) override role defaults.
export const useAdminPermission = () => {
  const role  = localStorage.getItem('adminRole')  || 'support';
  const name  = localStorage.getItem('adminName')  || 'Admin';
  const email = localStorage.getItem('adminEmail') || '';

  const isSuperAdmin = role === 'super_admin';
  const isAdmin      = role === 'admin' || isSuperAdmin;
  const isSupport    = role === 'support' || isAdmin;

  // Role-level defaults (fallback when no individual permissions are stored)
  const ROLE_DEFAULTS = {
    super_admin: { users: true,  payments: true,  content: true,  settings: true,  aiTools: true,  campaigns: true  },
    admin:       { users: true,  payments: true,  content: true,  settings: false, aiTools: true,  campaigns: true  },
    support:     { users: false, payments: false, content: false, settings: false, aiTools: false, campaigns: false },
  };

  // Individual permissions stored at login time (set by super admin per account)
  let storedPerms = {};
  try {
    storedPerms = JSON.parse(localStorage.getItem('adminPermissions') || '{}');
  } catch {}

  // Merge: stored individual permissions override role defaults
  const defaults    = ROLE_DEFAULTS[role] || ROLE_DEFAULTS.support;
  const permissions = { ...defaults, ...storedPerms };

  const can = (permission) => {
    if (isSuperAdmin) return true; // super_admin bypasses all checks
    return !!permissions[permission];
  };

  // Page-level access rules (role-based, not affected by individual permission toggles)
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
    '/admin/prospects':         ['super_admin', 'admin', 'support'],
    '/admin/prospect-outreach': ['super_admin', 'admin', 'support'],
  };

  const canAccessPage = (path) => {
    if (isSuperAdmin) return true;
    const allowed = PAGE_ACCESS[path];
    if (!allowed) return true;
    return allowed.includes(role);
  };

  return { role, name, email, isSuperAdmin, isAdmin, isSupport, permissions, can, canAccessPage };
};
