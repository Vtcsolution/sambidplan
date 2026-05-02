// frontend/src/services/api.js
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');
      localStorage.removeItem('userId');
      localStorage.removeItem('userNAICS');
      localStorage.removeItem('businessName');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (userData) => api.post('/api/auth/register', userData),
  login: (credentials) => api.post('/api/auth/login', credentials),
  getProfile: () => api.get('/api/auth/profile'),
  updateProfile: (data) => api.put('/api/auth/profile', data),
};

// Opportunity APIs
export const opportunityAPI = {
  getAll: (params) => api.get('/api/opportunities', { params }),
  getById: (id) => api.get(`/api/opportunities/${id}`),
  refresh: () => api.post('/api/opportunities/refresh'),
  updateNAICS: (naicsCodes) => api.put('/api/opportunities/profile/naics', { naicsCodes }),
  updateProfile: (data) => api.put('/api/opportunities/profile', data),
  getProfile: () => api.get('/api/opportunities/profile'),
  generateProposal: (id) => api.post(`/api/opportunities/${id}/proposal-outline`),
  getWinningBidsAnalysis: (naicsCode, page = 1, limit = 20) => 
    api.get('/api/opportunities/analysis/winning-bids', { 
      params: { naicsCode, page, limit } 
    }),
};

// Saved Opportunities APIs
export const savedAPI = {
  getAll: () => api.get('/api/saved'),
  save: (opportunityId, notes = '') => api.post('/api/saved', { opportunityId, notes }),
  unsave: (savedId) => api.delete(`/api/saved/${savedId}`),
  updateStatus: (savedId, status) => api.put(`/api/saved/${savedId}`, { status }),
};

// Payment APIs
export const paymentAPI = {
  getPlans: () => api.get('/api/payment/plans'),
  createInvoice: (data) => api.post('/api/payment/create-invoice', data),
  getInvoices: () => api.get('/api/payment/invoices'),
  getInvoiceById: (id) => api.get(`/api/payment/invoices/${id}`),
  cancelSubscription: () => api.post('/api/payment/cancel'),
  // Stripe
  createStripePayment: (data) => api.post('/api/payment/stripe/create-intent', data),
  confirmStripePayment: (data) => api.post('/api/payment/stripe/confirm', data),
  // PayPal
  createPayPalOrder: (data) => api.post('/api/payment/paypal/create-order', data),
  capturePayPalOrder: (data) => api.post('/api/payment/paypal/capture', data),
};

// Admin APIs
export const adminAPI = {
  getPlanRequests: (params) => api.get('/api/admin/plan-requests', { params }),
  getStats: () => api.get('/api/admin/stats'),
  createPlanRequest: (data) => api.post('/api/admin/plan-requests', data),
  getUserRequests: () => api.get('/api/admin/my-requests'),
  approvePlanRequest: (id, data) => api.post(`/api/admin/plan-requests/${id}/approve`, data),
  markRequestAsPaid: (id, data) => api.post(`/api/admin/plan-requests/${id}/mark-paid`, data),
  rejectPlanRequest: (id, data) => api.post(`/api/admin/plan-requests/${id}/reject`, data),
  getSettings: () => api.get('/api/admin/settings'),
  updateSettings: (data) => api.put('/api/admin/settings', data),
  getNotifications: (params) => api.get('/api/admin/notifications', { params }),
  createNotification: (data) => api.post('/api/admin/notifications', data),
  markNotificationAsRead: (id) => api.put(`/api/admin/notifications/${id}/read`),
  deleteNotification: (id) => api.delete(`/api/admin/notifications/${id}`),
  sendBroadcastEmail: (data) => api.post('/api/admin/notifications/broadcast', data),
  getUnreadNotificationsCount: () => api.get('/api/admin/notifications/unread/count'),
  getInvoices: (params) => api.get('/api/admin/invoices', { params }),
getInvoiceById: (id) => api.get(`/api/admin/invoices/${id}`),
updateInvoiceStatus: (id, data) => api.put(`/api/admin/invoices/${id}/status`, data),

// Recent Activity
getRecentActivity: () => api.get('/api/admin/recent-activity'),

// Users
getAllUsers: () => api.get('/api/admin/users'),
getUserById: (id) => api.get(`/api/admin/users/${id}`),
updateUserPlan: (id, data) => api.put(`/api/admin/users/${id}/plan`, data),
updateUserRole: (id, data) => api.put(`/api/admin/users/${id}/role`, data),
deleteUser: (id) => api.delete(`/api/admin/users/${id}`),
getPlans: () => api.get('/api/admin/plans'),
getPlanById: (id) => api.get(`/api/admin/plans/${id}`),
createPlan: (data) => api.post('/api/admin/plans', data),
updatePlan: (id, data) => api.put(`/api/admin/plans/${id}`, data),
deletePlan: (id) => api.delete(`/api/admin/plans/${id}`),
togglePlanStatus: (id) => api.patch(`/api/admin/plans/${id}/toggle`),
};
// Alert APIs
export const alertAPI = {
  getAlerts: () => api.get('/api/alerts'),
  saveAlert: (data) => api.post('/api/alerts', data),
  deleteAlert: (id) => api.delete(`/api/alerts/${id}`),
  toggleAlert: (id) => api.patch(`/api/alerts/${id}/toggle`),
  getNotifications: () => api.get('/api/alerts/notifications'),
  getUnreadCount: () => api.get('/api/alerts/notifications/unread/count'),
  markNotificationAsRead: (id) => api.put(`/api/alerts/notifications/${id}/read`),
  markAllNotificationsAsRead: () => api.put('/api/alerts/notifications/read-all'),
};
// AI APIs
export const aiAPI = {
  summarize: (opportunityId) => api.post(`/api/ai/summarize/${opportunityId}`),
  bidAnalysis: (opportunityId) => api.post(`/api/ai/bid-analysis/${opportunityId}`),
  fullProposal: (opportunityId) => api.post(`/api/ai/full-proposal/${opportunityId}`),
  askQuestion: (opportunityId, question) => api.post(`/api/ai/ask/${opportunityId}`, { question }),
  competitiveAnalysis: (opportunityId) => api.post(`/api/ai/competitive/${opportunityId}`),
  riskAssessment: (opportunityId) => api.post(`/api/ai/risk/${opportunityId}`),
};

export default api;