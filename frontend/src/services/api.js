import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle responses
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

// Authentication APIs
export const authAPI = {
  register: (username, email, password, full_name) =>
    api.post('/auth/register', { username, email, password, full_name }),
  
  login: (username, password) =>
    api.post('/auth/login', { username, password }),
  
  getMe: () =>
    api.get('/auth/me'),
  
  logout: () =>
    api.post('/auth/logout'),
};

// Device APIs
export const deviceAPI = {
  create: (deviceData) =>
    api.post('/devices', deviceData),
  
  list: () =>
    api.get('/devices'),
  
  get: (deviceId) =>
    api.get(`/devices/${deviceId}`),
  
  update: (deviceId, deviceData) =>
    api.put(`/devices/${deviceId}`, deviceData),
  
  delete: (deviceId) =>
    api.delete(`/devices/${deviceId}`),
  
  updateStatus: (deviceId, status) =>
    api.post(`/devices/${deviceId}/status`, { status }),
};

// Key APIs
export const keyAPI = {
  generate: (keyData) =>
    api.post('/keys/generate', keyData),
  
  list: () =>
    api.get('/keys'),
  
  get: (keyId) =>
    api.get(`/keys/${keyId}`),
  
  delete: (keyId) =>
    api.delete(`/keys/${keyId}`),
  
  export: (keyId) =>
    api.post(`/keys/${keyId}/export`),
  
  getEntropy: (keyId) =>
    api.get(`/keys/${keyId}/entropy`),
};

// Encryption APIs
export const encryptionAPI = {
  encrypt: (encryptionData) =>
    api.post('/crypto/encrypt', encryptionData),
  
  decrypt: (decryptionData) =>
    api.post('/crypto/decrypt', decryptionData),
  
  listOperations: (algorithm, operationType) =>
    api.get('/crypto/operations', {
      params: { algorithm, operation_type: operationType },
    }),
  
  getOperation: (operationId) =>
    api.get(`/crypto/operations/${operationId}`),
};

// Analysis APIs
export const analysisAPI = {
  analyzeEntropy: (analysisData) =>
    api.post('/analysis/entropy', analysisData),
  
  getAlgorithmComparison: () =>
    api.get('/analysis/performance/comparison'),
  
  getDashboardStatistics: () =>
    api.get('/analysis/dashboard/statistics'),
  
  getKeyUsageHistory: (keyId) =>
    api.get(`/analysis/keys/${keyId}/history`),
  
  getAlgorithmStatistics: (algorithm) =>
    api.get(`/analysis/algorithms/${algorithm}/statistics`),
};

// Admin APIs
export const adminAPI = {
  getStats: () =>
    api.get('/admin/stats'),

  listUsers: () =>
    api.get('/admin/users'),

  activateUser: (userId) =>
    api.put(`/admin/users/${userId}/activate`),

  deactivateUser: (userId) =>
    api.put(`/admin/users/${userId}/deactivate`),

  deleteUser: (userId) =>
    api.delete(`/admin/users/${userId}`),

  listDevices: () =>
    api.get('/admin/devices'),

  listKeys: () =>
    api.get('/admin/keys'),

  listOperations: () =>
    api.get('/admin/operations'),

  getLogs: () =>
    api.get('/admin/logs'),
};

// General APIs
export const generalAPI = {
  getInfo: () =>
    api.get('/api/info'),

  health: () =>
    api.get('/health'),
};

export default api;
