import api from './api.js';

export const referralAPI = {
  getStats:              ()  => api.get('/referral/stats'),
  withdraw:              (d) => api.post('/referral/withdraw', d),
  applyBalance:          (d) => api.post('/referral/apply-balance', d),
  activateWithBalance:   (d) => api.post('/referral/activate-with-balance', d),
};
