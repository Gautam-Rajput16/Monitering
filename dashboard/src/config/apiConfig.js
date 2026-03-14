// Base configuration for API
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
  },
  USERS: {
    LIST: '/users',
    DETAILS: (id) => `/users/${id}`,
  },
  LOCATION: {
    CURRENT: (userId) => `/location/${userId}`,
    HISTORY: (userId) => `/location/history/${userId}`,
  },
  STREAM: {
    START: '/stream/start',
    STOP: '/stream/stop',
  }
};
