// frontend/src/services/api.js
import axios from 'axios';

// Make sure the BASE_URL includes /api
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Keys used across the app for auth storage
const AUTH_KEYS = ['authToken', 'userEmail', 'userName', 'userId', 'userPlan', 'userRole', 'userNAICS', 'businessName'];

export const clearAuthStorage = () => {
  AUTH_KEYS.forEach(k => { localStorage.removeItem(k); sessionStorage.removeItem(k); });
};

// Guard against redirect loop when multiple parallel requests all get 401
let redirectingToLogin = false;

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Skip 401 handling for the login endpoint itself (wrong credentials, not stale token)
    const isLoginRequest = error.config?.url?.includes('/auth/login');

    if (error.response?.status === 401 && !isLoginRequest && !redirectingToLogin) {
      redirectingToLogin = true;
      clearAuthStorage();
      // Small delay so any in-flight state updates finish before reload
      setTimeout(() => {
        window.location.href = '/login';
        redirectingToLogin = false;
      }, 100);
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register:         (userData) => api.post('/auth/register', userData),
  login:            (credentials) => api.post('/auth/login', credentials),
  getProfile:       () => api.get('/auth/profile'),
  updateProfile:    (data) => api.put('/auth/profile', data),
  forgotPassword:   (email) => api.post('/auth/forgot-password', { email }),
  verifyResetOtp:   (email, otp) => api.post('/auth/verify-reset-otp', { email, otp }),
  resetPassword:    (token, password) => api.post(`/auth/reset-password/${token}`, { password }),
  changePassword:   (data) => api.post('/auth/change-password', data),
  getCertifications:        ()     => api.get('/auth/certifications'),
  addCertification:         (data) => api.post('/auth/certifications', data),
  deleteCertification:      (id)   => api.delete(`/auth/certifications/${id}`),
  teamingPartners:          (params) => api.get('/auth/teaming-partners', { params }),
  resendVerificationEmail:  ()     => api.post('/auth/resend-verification'),
  // 2FA
  setup2FA:        ()           => api.post('/auth/2fa/setup'),
  enable2FA:       (token)      => api.post('/auth/2fa/enable', { token }),
  disable2FA:      (data)       => api.post('/auth/2fa/disable', data),
  verifyLogin2FA:  (data)       => api.post('/auth/2fa/verify-login', data),
  getBackupCodes:  ()           => api.get('/auth/2fa/backup-codes'),
  // Privacy & data
  exportData:      ()           => api.get('/auth/export-data'),
  deleteAccount:   (data)       => api.delete('/auth/account', { data }),
};

// Opportunity APIs
export const opportunityAPI = {
  getAll: (params) => api.get('/opportunities', { params }),
  getById: (id) => api.get(`/opportunities/${id}`),
  // Named to match what WinningBidsAnalysis component calls
  getWinningBidsAnalysis: (naicsCode, page = 1, limit = 20) =>
    api.get('/opportunities/analysis/winning-bids', { params: { naicsCode, page, limit } }),
  refresh: () => api.post('/opportunities/refresh'),
  refreshMyFeed: () => api.post('/opportunities/refresh-my-feed'),
  generateProposal: (id) => api.post(`/opportunities/${id}/proposal-outline`),
  updateProfile: (data) => api.put('/opportunities/profile', data),
  getProfile: () => api.get('/opportunities/profile'),
};

// Saved Opportunities APIs
export const savedAPI = {
  getAll: () => api.get('/saved'),
  getPipeline: () => api.get('/saved/pipeline'),
  save: (opportunityId, notes = '') => api.post('/saved', { opportunityId, notes }),
  unsave: (savedId) => api.delete(`/saved/${savedId}`),
  updateStatus: (savedId, status) => api.put(`/saved/${savedId}`, { status }),
  updateCard: (savedId, data) => api.put(`/saved/${savedId}`, data),
  checkSaved: (opportunityId) => api.get(`/saved/check/${opportunityId}`),
};

// Payment APIs
export const paymentAPI = {
  getPlans: () => api.get('/payment/plans'),
  createInvoice: (data) => api.post('/payment/create-invoice', data),
  getInvoices: () => api.get('/payment/invoices'),
  getInvoiceById: (id) => api.get(`/payment/invoices/${id}`),
  cancelSubscription: () => api.post('/payment/cancel'),
  createStripePayment: (data) => api.post('/payment/stripe/create-intent', data),
  confirmStripePayment: (data) => api.post('/payment/stripe/confirm', data),
  createPayPalOrder: (data) => api.post('/payment/paypal/create-order', data),
  capturePayPalOrder: (data) => api.post('/payment/paypal/capture', data),
  simulatePayPalCapture: (data) => api.post('/payment/paypal/simulate-capture', data),
  createPayoneerSession: (data) => api.post('/payment/payoneer/create-session', data),
  capturePayoneerPayment: (data) => api.post('/payment/payoneer/capture', data),
  getPlanStatus: () => api.get('/payment/plan-status'),
  createPlanRequest:   (data)    => api.post('/payment/plan-requests', data),
  getMyPlanRequests:   ()        => api.get('/payment/plan-requests'),
  submitPaymentProof:  (id, data)=> api.post(`/payment/plan-requests/${id}/submit-proof`, data),
};

// Admin APIs
export const adminAPI = {
  getPlanRequests: (params) => api.get('/admin/plan-requests', { params }),
  getStats: () => api.get('/admin/stats'),
  triggerFetch: () => api.post('/admin/trigger-fetch'),
  createPlanRequest: (data) => api.post('/admin/plan-requests', data),
  getUserRequests: () => api.get('/admin/my-requests'),
  approvePlanRequest: (id, data) => api.post(`/admin/plan-requests/${id}/approve`, data),
  markRequestAsPaid: (id, data) => api.post(`/admin/plan-requests/${id}/mark-paid`, data),
  rejectPlanRequest: (id, data) => api.post(`/admin/plan-requests/${id}/reject`, data),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.put('/admin/settings', data),
  getNotifications: (params) => api.get('/admin/notifications', { params }),
  createNotification: (data) => api.post('/admin/notifications', data),
  markNotificationAsRead: (id) => api.put(`/admin/notifications/${id}/read`),
  deleteNotification: (id) => api.delete(`/admin/notifications/${id}`),
  sendBroadcastEmail: (data) => api.post('/admin/notifications/broadcast', data),
  getUnreadNotificationsCount: () => api.get('/admin/notifications/unread/count'),
  getInvoices: (params) => api.get('/admin/invoices', { params }),
  getInvoiceById: (id) => api.get(`/admin/invoices/${id}`),
  updateInvoiceStatus: (id, data) => api.put(`/admin/invoices/${id}/status`, data),
  getRecentActivity: () => api.get('/admin/recent-activity'),
  getAllUsers: () => api.get('/admin/users'),
  getUserById: (id) => api.get(`/admin/users/${id}`),
  updateUserPlan: (id, data) => api.put(`/admin/users/${id}/plan`, data),
  updateUserRole: (id, data) => api.put(`/admin/users/${id}/role`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getPlans: () => api.get('/admin/plans'),
  getPlanById: (id) => api.get(`/admin/plans/${id}`),
  createPlan: (data) => api.post('/admin/plans', data),
  updatePlan: (id, data) => api.put(`/admin/plans/${id}`, data),
  deletePlan: (id) => api.delete(`/admin/plans/${id}`),
  togglePlanStatus: (id) => api.patch(`/admin/plans/${id}/toggle`),

  // SAM Company Directory
  getCompanies:      (params) => api.get('/admin/companies',            { params }),
  getCompanyStats:   ()       => api.get('/admin/companies/stats'),
  syncCompanies:     (data)   => api.post('/admin/companies/sync',      data),
  fetchOneCompany:   (data)   => api.post('/admin/companies/fetch-one', data),
};

// Alert APIs
export const alertAPI = {
  getAlerts: () => api.get('/alerts'),
  saveAlert: (data) => api.post('/alerts', data),
  deleteAlert: (id) => api.delete(`/alerts/${id}`),
  toggleAlert: (id) => api.patch(`/alerts/${id}/toggle`),
  getNotifications: () => api.get('/alerts/notifications'),
  getUnreadCount: () => api.get('/alerts/notifications/unread/count'),
  markNotificationAsRead: (id) => api.put(`/alerts/notifications/${id}/read`),
  markAllNotificationsAsRead: () => api.put('/alerts/notifications/read-all'),
};

// AI APIs
export const aiAPI = {
  summarize:            (opportunityId) => api.post(`/ai/summarize/${opportunityId}`),
  bidAnalysis:          (opportunityId) => api.post(`/ai/bid-analysis/${opportunityId}`),
  fullProposal:         (opportunityId) => api.post(`/ai/full-proposal/${opportunityId}`),
  askQuestion:          (opportunityId, question) => api.post(`/ai/ask/${opportunityId}`, { question }),
  competitiveAnalysis:  (opportunityId) => api.post(`/ai/competitive/${opportunityId}`),
  riskAssessment:       (opportunityId) => api.post(`/ai/risk/${opportunityId}`),
  capabilityStatement:  (data) => api.post('/ai/capability-statement', data),
  analyzeRFP:           (data) => data instanceof FormData
    ? api.post('/ai/analyze-rfp', data, { headers: { 'Content-Type': 'multipart/form-data' } })
    : api.post('/ai/analyze-rfp', data),
  sourcesSought:        (data) => api.post('/ai/sources-sought', data),
  analyzeAttachment:    (attachmentUrl) => api.post('/ai/analyze-attachment', { attachmentUrl }),
  goNoGo:               (data) => api.post('/ai/go-no-go', data),
  marketResearch:       () => api.post('/ai/market-research'),
  incumbentIntelligence: (opportunityId) => api.get(`/ai/incumbent/${opportunityId}`),
};

// Push Notification APIs
export const pushAPI = {
  getVapidKey:   ()    => api.get('/push/vapid-public-key'),
  subscribe:     (sub) => api.post('/push/subscribe', sub),
  unsubscribe:   (endpoint) => api.delete('/push/unsubscribe', { data: { endpoint } }),
  getStatus:     ()    => api.get('/push/status'),
  sendTest:      ()    => api.post('/push/test'),
};

// Contact / Enterprise Inquiry APIs
export const contactAPI = {
  submit:       (data)       => api.post('/contact', data),
  chat:         (data)       => api.post('/contact/chat', data),
  myInquiries:  ()           => api.get('/contact/mine'),
  getAll:       (params)     => api.get('/contact', { params }),
  update:       (id, data)   => api.put(`/contact/${id}`, data),
  activatePlan: (id, data)   => api.post(`/contact/${id}/activate-plan`, data),
};

// Dashboard API
export const dashboardAPI = {
  getStats:        ()      => api.get('/dashboard/stats'),
  getCalendar:     (month) => api.get('/dashboard/calendar', { params: { month } }),
};

// AI Predictions API
export const predictionAPI = {
  getDashboard: (refresh = false) => api.get('/predictions/dashboard', { params: refresh ? { refresh: 'true' } : {} }),
  getCredits:   () => api.get('/predictions/credits'),
};

// Credit Top-Up API
export const creditTopupAPI = {
  createOrder:  (data)      => api.post('/credits/create-order', data),
  capture:      (data)      => api.post('/credits/capture', data),
  myRequests:   ()          => api.get('/credits/my-requests'),
  adminList:    (params)    => api.get('/credits/admin/list', { params }),
  adminApprove: (id, data)  => api.put(`/credits/admin/${id}/approve`, data),
  adminReject:  (id, data)  => api.put(`/credits/admin/${id}/reject`, data),
};

// Support Ticket APIs
export const ticketAPI = {
  create:   (formData) => api.post('/tickets', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getAll:   (params)   => api.get('/tickets', { params }),
  getById:  (id)       => api.get(`/tickets/${id}`),
  reply:    (id, formData) => api.post(`/tickets/${id}/reply`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  close:    (id)       => api.put(`/tickets/${id}/close`),
};

// Suggestion / Feedback APIs
export const suggestionAPI = {
  create:  (data)   => api.post('/suggestions', data),
  getMy:   (params) => api.get('/suggestions/my', { params }),
};

// Admin Suggestion APIs
export const adminSuggestionAPI = {
  getAll:  (params) => api.get('/admin/suggestions', { params }),
  update:  (id, data) => api.patch(`/admin/suggestions/${id}`, data),
  delete:  (id)     => api.delete(`/admin/suggestions/${id}`),
};

// Past Performance Repository
export const pastPerformanceAPI = {
  getAll:       (params)   => api.get('/past-performance', { params }),
  getOne:       (id)       => api.get(`/past-performance/${id}`),
  create:       (data)     => api.post('/past-performance', data),
  update:       (id, data) => api.put(`/past-performance/${id}`, data),
  remove:       (id)       => api.delete(`/past-performance/${id}`),
  exportOne:    (id)       => api.get(`/past-performance/${id}/export`),
  exportBatch:  (ids)      => api.post('/past-performance/export/batch', { ids }),
};

export default api;