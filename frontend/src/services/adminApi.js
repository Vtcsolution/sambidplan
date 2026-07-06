// Separate axios instance for admin panel — uses adminToken, not authToken
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const adminApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach adminToken to every request
adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401 → clear admin session and redirect to admin login
// Use a flag to prevent multiple concurrent logout redirects
let isLoggingOut = false;

adminApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !isLoggingOut) {
      isLoggingOut = true;
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminName');
      localStorage.removeItem('adminEmail');
      localStorage.removeItem('adminRole');
      window.location.href = '/admin/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const adminAuthAPI = {
  login:          (data)   => adminApi.post('/admin-auth/login', data),
  profile:        ()       => adminApi.get('/admin-auth/profile'),
  changePassword: (data)   => adminApi.put('/admin-auth/change-password', data),
  createAdmin:    (data)   => adminApi.post('/admin-auth/create', data),
  listAdmins:     ()       => adminApi.get('/admin-auth/list'),
  updateAdmin:    (id, d)  => adminApi.put(`/admin-auth/${id}`, d),
  deleteAdmin:    (id)     => adminApi.delete(`/admin-auth/${id}`),
  seed:           (data)   => adminApi.post('/admin-auth/seed', data),
};

// ── Existing admin APIs (using adminToken now) ────────────────────────────────
export const adminPanelAPI = {
  getStats:              ()     => adminApi.get('/admin/stats'),
  getPlanRequests:       (p)    => adminApi.get('/admin/plan-requests', { params: p }),
  getAnnualInvoices:     (p)    => adminApi.get('/admin/annual-invoices', { params: p }),
  approvePlanRequest:         (id,d) => adminApi.post(`/admin/plan-requests/${id}/approve`, d),
  markRequestAsPaid:          (id,d) => adminApi.post(`/admin/plan-requests/${id}/mark-paid`, d),
  rejectPlanRequest:          (id,d) => adminApi.post(`/admin/plan-requests/${id}/reject`, d),
  sendPaymentInstructions:    (id,d) => adminApi.post(`/admin/plan-requests/${id}/send-instructions`, d),
  getNotifications:      (p)    => adminApi.get('/admin/notifications', { params: p }),
  // Both names kept — markNotificationRead is the original, markNotificationAsRead used by components
  markNotificationRead:     (id) => adminApi.put(`/admin/notifications/${id}/read`),
  markNotificationAsRead:   (id) => adminApi.put(`/admin/notifications/${id}/read`),
  deleteNotification:    (id)   => adminApi.delete(`/admin/notifications/${id}`),
  // Both names kept — getUnreadCount is original, getUnreadNotificationsCount used by components
  getUnreadCount:               () => adminApi.get('/admin/notifications/unread/count'),
  getUnreadNotificationsCount:  () => adminApi.get('/admin/notifications/unread/count'),
  getPendingCounts:             () => adminApi.get('/admin/pending-counts'),
  // Both names kept — sendBroadcast is original, sendBroadcastEmail used by components
  sendBroadcast:         (d)    => adminApi.post('/admin/notifications/broadcast', d),
  sendBroadcastEmail:    (d)    => adminApi.post('/admin/notifications/broadcast', d),
  getInvoices:           (p)    => adminApi.get('/admin/invoices', { params: p }),
  getInvoiceById:        (id)   => adminApi.get(`/admin/invoices/${id}`),
  updateInvoiceStatus:   (id,d) => adminApi.put(`/admin/invoices/${id}/status`, d),
  getAllUsers:            ()     => adminApi.get('/admin/users'),
  getUserById:           (id)   => adminApi.get(`/admin/users/${id}`),
  updateUserPlan:        (id,d) => adminApi.put(`/admin/users/${id}/plan`, d),
  updateUserRole:        (id,d) => adminApi.put(`/admin/users/${id}/role`, d),
  grantCredits:          (id,d) => adminApi.put(`/admin/users/${id}/grant-credits`, d),
  unlockUser:            (id,d) => adminApi.put(`/admin/users/${id}/unlock`, d),
  deleteUser:            (id)   => adminApi.delete(`/admin/users/${id}`),
  getSettings:           ()     => adminApi.get('/admin/settings'),
  updateSettings:        (d)    => adminApi.put('/admin/settings', d),
  testEmail:             (d)    => adminApi.post('/admin/email/test', d),
  triggerFetch:          ()     => adminApi.post('/admin/trigger-fetch'),
  triggerBulk:           ()     => adminApi.post('/admin/trigger-bulk'),
  triggerFetchTest:      (offset) => adminApi.post('/admin/trigger-fetch-test', { offset }),
  triggerBulkTest:       (offset) => adminApi.post('/admin/trigger-bulk-test', { offset }),
  getHybridOpportunities:(p)    => adminApi.get('/admin/hybrid-opportunities', { params: p }),
  getRecentActivity:     ()     => adminApi.get('/admin/recent-activity'),
  getContactInquiries:    (p)    => adminApi.get('/contact', { params: p }),
  updateContactInquiry:   (id,d) => adminApi.put(`/contact/${id}`, d),
  confirmInquiryPayment:  (id,d) => adminApi.post(`/contact/${id}/confirm-payment`, d),
  activatePlan:           (id,d) => adminApi.post(`/contact/${id}/activate-plan`, d),
  // Referral management
  getAllReferrals:        (p)    => adminApi.get('/admin/referrals', { params: p }),
  getAllWithdrawals:      (p)    => adminApi.get('/admin/withdrawals', { params: p }),
  processWithdrawal:     (id,d) => adminApi.put(`/admin/withdrawals/${id}`, d),
  reconcileReferrals:    ()     => adminApi.post('/admin/referrals/reconcile'),
  // Plan CRUD (hits /api/admin/plans via adminPlanRoutes)
  getPlans:              ()     => adminApi.get('/admin/plans'),
  createPlan:            (d)    => adminApi.post('/admin/plans', d),
  updatePlan:            (id,d) => adminApi.put(`/admin/plans/${id}`, d),
  deletePlan:            (id)   => adminApi.delete(`/admin/plans/${id}`),
  togglePlanStatus:      (id)   => adminApi.patch(`/admin/plans/${id}/toggle`),

  // SAM Company Directory
  getCompanies:          (p)    => adminApi.get('/admin/companies',                       { params: p }),
  getCompanyStats:       ()     => adminApi.get('/admin/companies/stats'),
  getCompanySourceStats: ()     => adminApi.get('/admin/companies/source-stats'),
  syncCompanies:         (d)    => adminApi.post('/admin/companies/sync',                 d),
  fetchOneCompany:       (d)    => adminApi.post('/admin/companies/fetch-one',            d),
  syncUsaSpending:       (d)    => adminApi.post('/admin/companies/sync-usaspending',     d),
  syncFpds:              (d)    => adminApi.post('/admin/companies/sync-fpds',            d),
  syncSba:               (d)    => adminApi.post('/admin/companies/sync-sba',             d),
  clearAllCompanies:     ()     => adminApi.post('/admin/companies/clear',                { confirmed: true }),
};

// ── Opportunity management (admin) ───────────────────────────────────────────
export const adminOpportunityAPI = {
  getAll:   (params) => adminApi.get('/opportunities', { params }),
  getById:  (id)     => adminApi.get(`/opportunities/${id}`),
  refresh:  ()       => adminApi.post('/opportunities/refresh'),
};

// ── Admin AI APIs ─────────────────────────────────────────────────────────────
export const adminAIAPI = {
  getInsights:      ()  => adminApi.post('/admin-ai/insights'),
  getSegments:      ()  => adminApi.get('/admin-ai/segments'),
  getChurn:         ()  => adminApi.get('/admin-ai/churn-prediction'),
  getHealth:        ()  => adminApi.get('/admin-ai/platform-health'),
  generateContent:  (d) => adminApi.post('/admin-ai/generate-content', d),
  getRevenueForecast: () => adminApi.get('/admin-ai/revenue-forecast'),
  sendCampaign:       (d)    => adminApi.post('/admin-ai/send-campaign', d),
  getSegmentUsers:    (seg)  => adminApi.get('/admin-ai/segment-users', { params: { segment: seg } }),
  getCampaignHistory: (page) => adminApi.get('/admin-ai/campaign-history', { params: { page, limit: 20 } }),
};

// ── Support Tickets (admin) ───────────────────────────────────────────────────
export const adminTicketAPI = {
  getAll:        (params)   => adminApi.get('/admin/tickets', { params }),
  getById:       (id)       => adminApi.get(`/admin/tickets/${id}`),
  reply:         (id, formData) => adminApi.post(`/admin/tickets/${id}/reply`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateStatus:  (id, status)   => adminApi.put(`/admin/tickets/${id}/status`, { status }),
};

// ── Suggestions (admin) ───────────────────────────────────────────────────────
export const adminSuggestionAPI = {
  getAll:  (params)     => adminApi.get('/admin/suggestions', { params }),
  update:  (id, data)   => adminApi.patch(`/admin/suggestions/${id}`, data),
  delete:  (id)         => adminApi.delete(`/admin/suggestions/${id}`),
};

// ── Prospects (federal contract bidder database) ──────────────────────────────
export const adminProspectAPI = {
  getStats:          ()       => adminApi.get('/admin/prospects/stats'),
  getAll:            (params) => adminApi.get('/admin/prospects', { params }),
  export:            (params) => adminApi.get('/admin/prospects/export', { params, responseType: 'blob' }),
  getSyncStatus:     ()       => adminApi.get('/admin/prospects/sync/status'),
  startSync:         ()       => adminApi.post('/admin/prospects/sync/start'),
  collectOnly:       ()       => adminApi.post('/admin/prospects/sync/collect'),
  enrichOnly:        ()       => adminApi.post('/admin/prospects/sync/enrich'),
  resumeSync:        ()       => adminApi.post('/admin/prospects/sync/resume'),
  stopSync:          ()       => adminApi.post('/admin/prospects/sync/stop'),
  clearAll:          ()       => adminApi.post('/admin/prospects/sync/clear', { confirmed: true }),
  markContacted:     (id, d)  => adminApi.put(`/admin/prospects/${id}/contacted`, d),
  bulkMarkContacted: (d)      => adminApi.post('/admin/prospects/bulk/contacted', d),
  updateStatus:      (id, d)  => adminApi.put(`/admin/prospects/${id}/status`, d),
  deleteOne:         (id)     => adminApi.delete(`/admin/prospects/${id}`),
  // AI website finder
  getAIFinderStatus: ()       => adminApi.get('/admin/prospects/ai-finder/status'),
  startAIFinder:     (body)   => adminApi.post('/admin/prospects/ai-finder/start', body || {}),
  stopAIFinder:      ()       => adminApi.post('/admin/prospects/ai-finder/stop'),
  // Quick-add a manual prospect
  quickAdd:              (body)     => adminApi.post('/admin/prospects/quick-add', body),
  // Email outreach
  getEmailTemplates:     ()         => adminApi.get('/admin/prospects/email/templates'),
  previewEmailTemplate:  (id)       => adminApi.get(`/admin/prospects/email/preview/${id}`),
  generateEmail:         (body)     => adminApi.post('/admin/prospects/email/generate', body),
  sendProspectEmails:    (body)     => adminApi.post('/admin/prospects/email/send', body),
  getEmailHistory:       (id)       => adminApi.get(`/admin/prospects/${id}/email-history`),
};

// ── Credit Top-Up admin routes (uses adminToken) ─────────────────────────────
export const adminCreditAPI = {
  list:    (params)    => adminApi.get('/credits/admin/list', { params }),
  approve: (id, data)  => adminApi.put(`/credits/admin/${id}/approve`, data),
  reject:  (id, data)  => adminApi.put(`/credits/admin/${id}/reject`, data),
};

// ── Support referral routes ───────────────────────────────────────────────────
export const supportAPI = {
  getStats:            ()          => adminApi.get('/support/stats'),
  withdraw:            (data)      => adminApi.post('/support/withdraw', data),
  adminGetAll:         ()          => adminApi.get('/support/admin/all'),
  adminGetWithdrawals: ()          => adminApi.get('/support/admin/withdrawals'),
  adminProcess:        (id, data)  => adminApi.put(`/support/admin/withdrawals/${id}`, data),
};

// alias used by AdminSupportEarnings (same as supportAPI)
export { supportAPI as supportEarningsAPI };

// ── Partner application routes ────────────────────────────────────────────────
export const partnerAPI = {
  listApplications:  (status) => adminApi.get('/partner/admin/applications', { params: { status } }),
  processApplication:(id, data) => adminApi.put(`/partner/admin/applications/${id}`, data),
};

export default adminApi;
