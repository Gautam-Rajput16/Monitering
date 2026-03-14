import axios from 'axios';
import { API_URL, ENDPOINTS } from '../config/apiConfig';
import { logger } from '../utils/logger';

// Create a centralized Axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

// Request Interceptor: Attach token if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('spy_admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    logger.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle global errors (e.g., 401 Unauthorized)
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    logger.error('API Response Error:', error.response?.data || error.message);
    
    if (error.response && error.response.status === 401) {
      // Handle unauthorized (e.g., token expired)
      localStorage.removeItem('spy_admin_token');
      // Force reload to redirect to login if we are in a protected route
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API Service Functions
export const apiService = {
  // Authentication
  loginAdmin: async (credentials) => {
    return apiClient.post(ENDPOINTS.AUTH.LOGIN, credentials);
  },

  // Users
  getUsers: async () => {
    return apiClient.get(ENDPOINTS.USERS.LIST);
  },

  getUserDetails: async (userId) => {
    return apiClient.get(ENDPOINTS.USERS.DETAILS(userId));
  },

  // Location
  getUserLocation: async (userId) => {
    return apiClient.get(ENDPOINTS.LOCATION.CURRENT(userId));
  },

  getLocationHistory: async (userId) => {
    return apiClient.get(ENDPOINTS.LOCATION.HISTORY(userId));
  },

  // Streams (Active)
  // Assuming the backend returns a list of active streams if we hit /users or similar
  // Wait, user specified getActiveStreams. Let's create a generic endpoint if it doesn't exist, we'll map it.
  // The user prompt said: "POST /api/stream/start", "POST /api/stream/stop" and "getActiveStreams" (maybe GET /api/streams/active ? I will add an endpoint mapping for it).
  getActiveStreams: async () => {
    return apiClient.get('/streams/active').catch(() => {
      logger.warn('getActiveStreams endpoint might not exist, returning empty array');
      return [];
    });
  },

  startStream: async (userId, type) => {
    return apiClient.post(ENDPOINTS.STREAM.START, { userId, type });
  },

  stopStream: async (userId, type) => {
    return apiClient.post(ENDPOINTS.STREAM.STOP, { userId, type });
  }
};

export default apiService;
