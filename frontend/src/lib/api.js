import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Property APIs
export const propertyAPI = {
  getAll: (params) => api.get('/properties', { params }),
  getPublic: (id) => api.get(`/properties/${id}/public`),
  getById: (id) => api.get(`/properties/${id}`),
  create: (data) => api.post('/properties', data),
  update: (id, data) => api.put(`/properties/${id}`, data),
  delete: (id) => api.delete(`/properties/${id}`),
  approve: (id, status) => api.post(`/properties/${id}/approve`, { status }),
  getMyListings: () => api.get('/properties/my-listings'),
  getPending: () => api.get('/properties/pending'),
  getAllAdmin: () => api.get('/properties/all'),
  unlock: (id) => api.post(`/properties/${id}/unlock`),
};

// Wallet APIs
export const walletAPI = {
  get: () => api.get('/wallet'),
  getUserWallet: (userId) => api.get(`/wallet/${userId}`),
};

// Token APIs
export const tokenAPI = {
  purchase: (data) => api.post('/tokens/purchase', data),
};

// Unlock APIs
export const unlockAPI = {
  getMyUnlocks: () => api.get('/unlocks'),
};

// Inspection APIs
export const inspectionAPI = {
  request: (data) => api.post('/inspections', data),
  getMyInspections: () => api.get('/inspections'),
  getAssigned: () => api.get('/inspections/assigned'),
  getAll: () => api.get('/inspections/all'),
  update: (id, data) => api.put(`/inspections/${id}`, data),
  getAgentContact: (id) => api.get(`/inspections/${id}/agent-contact`),
};

// Transaction APIs
export const transactionAPI = {
  getMyTransactions: () => api.get('/transactions'),
  getAll: () => api.get('/transactions/all'),
};

// Agent Verification APIs
export const verificationAPI = {
  request: (data) => api.post('/agent-verification/request', data),
  getMyRequest: () => api.get('/agent-verification/my-request'),
  getPending: () => api.get('/agent-verification/pending'),
  getAll: () => api.get('/agent-verification/all'),
  review: (id, status) => api.post(`/agent-verification/${id}/review`, { status }),
};

// User Management APIs (Admin)
export const userAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  updateRole: (userId, role) => api.put(`/users/${userId}/role`, { user_id: userId, role }),
  suspend: (userId, suspended) => api.put(`/users/${userId}/suspend`, { user_id: userId, suspended }),
};

// Admin Stats
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
};

// Payment APIs
export const paymentAPI = {
  verify: (reference) => api.post(`/payments/verify/${reference}`),
  simulate: (reference) => api.post(`/payments/simulate/${reference}`),
};

export default api;
