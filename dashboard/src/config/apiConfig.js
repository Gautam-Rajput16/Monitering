// ─── Environment URLs ───────────────────────────────────────────
const PROD_URL = 'https://spy-backend-yk4g.onrender.com';
const DEV_URL = 'http://localhost:5000';

// Automatic switching based on development vs production build
const BASE_URL = import.meta.env.DEV ? DEV_URL : PROD_URL;

export const API_URL = `${BASE_URL}/api`;
export const SOCKET_URL = BASE_URL;

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
