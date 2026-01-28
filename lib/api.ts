import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; name?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  createApiKey: (data: { name: string; expiresAt?: string }) =>
    api.post('/auth/api-keys', data),
  getApiKeys: () => api.get('/auth/api-keys'),
  revokeApiKey: (id: string) => api.delete(`/auth/api-keys/${id}`),
};

// Sessions API
export const sessionsApi = {
  create: (data?: { metadata?: Record<string, any> }) =>
    api.post('/sessions', data || {}),
  getAll: () => api.get('/sessions'),
  getOne: (id: string) => api.get(`/sessions/${id}`),
  updateStatus: (id: string, status: string) =>
    api.patch(`/sessions/${id}/status`, null, { params: { status } }),
  updateName: (id: string, name: string) =>
    api.patch(`/sessions/${id}/name`, { name }),
  delete: (id: string) => api.delete(`/sessions/${id}`),
  getMemory: (id: string) => api.get(`/sessions/${id}/memory`),
};

// Agent API
export const agentApi = {
  plan: (sessionId: string, data: { input: string; context?: string }) =>
    api.post(`/agent/sessions/${sessionId}/plan`, data),
  execute: (sessionId: string, plan: any) =>
    api.post(`/agent/sessions/${sessionId}/execute`, plan),
};

// Tools API
export const toolsApi = {
  getAll: () => api.get('/tools'),
  getOne: (id: string) => api.get(`/tools/${id}`),
};

// Memory API
export const memoryApi = {
  add: (sessionId: string, data: { type?: string; content: string; metadata?: Record<string, any> }) =>
    api.post(`/sessions/${sessionId}/memory`, data),
  getContext: (sessionId: string, limit?: number) =>
    api.get(`/sessions/${sessionId}/memory`, { params: { limit } }),
};

// Spotify Predictor API
export const spotifyApi = {
  predict: (data: {
    danceability: number;
    energy: number;
    loudness: number;
    tempo: number;
    duration_ms: number;
    artist_popularity?: number;
  }) => api.post('/spotify-predictor/predict', data),
  health: () => api.get('/spotify-predictor/health'),
  reload: () => api.post('/spotify-predictor/reload'),
};

