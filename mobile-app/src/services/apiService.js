/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                     API SERVICE                               ║
 * ║  Axios instance with JWT interceptor + all API methods        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL, ENDPOINTS } from '../config/apiConfig';
import { STORAGE_KEYS } from '../config/constants';
import logger from '../utils/logger';

// ─── Axios Instance ─────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor — attach JWT token ─────────────────────
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      logger.error('Failed to get auth token from storage', err.message);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor — normalize errors ────────────────────
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong';

    logger.error(`API Error: ${message}`, {
      url: error.config?.url,
      status: error.response?.status,
    });

    return Promise.reject({
      message,
      status: error.response?.status,
      errors: error.response?.data?.errors,
    });
  }
);

// ═══════════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════════

/**
 * Register a new user account.
 * @param {string} email
 * @param {string} password
 */
export const registerUser = async (email, password) => {
  const response = await api.post(ENDPOINTS.AUTH_REGISTER, { email, password });
  if (response.success && response.data?.token) {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.data.token);
    await AsyncStorage.setItem(
      STORAGE_KEYS.USER_DATA,
      JSON.stringify(response.data.user)
    );
  }
  return response;
};

/**
 * Login with email + password. Stores JWT on success.
 * @param {string} email
 * @param {string} password
 */
export const loginUser = async (email, password) => {
  const response = await api.post(ENDPOINTS.AUTH_LOGIN, { email, password });
  if (response.success && response.data?.token) {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.data.token);
    await AsyncStorage.setItem(
      STORAGE_KEYS.USER_DATA,
      JSON.stringify(response.data.user)
    );
  }
  return response;
};

/**
 * Get current user profile.
 */
export const getProfile = () => api.get(ENDPOINTS.AUTH_PROFILE);

/**
 * Logout — clear stored credentials.
 */
export const logoutUser = async () => {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.AUTH_TOKEN,
    STORAGE_KEYS.USER_DATA,
  ]);
};

// ═══════════════════════════════════════════════════════════════
//  DEVICE
// ═══════════════════════════════════════════════════════════════

/**
 * Register the mobile device with the backend.
 * @param {{ deviceId: string, deviceName: string, osType: string }} data
 */
export const registerDevice = (data) =>
  api.post(ENDPOINTS.DEVICE_REGISTER, data);

// ═══════════════════════════════════════════════════════════════
//  LOCATION
// ═══════════════════════════════════════════════════════════════

/**
 * Send a location update via REST API.
 * @param {{ latitude: number, longitude: number, accuracy: number, timestamp: string }} payload
 */
export const sendLocationUpdate = (payload) =>
  api.post(ENDPOINTS.LOCATION_UPDATE, payload);

// ═══════════════════════════════════════════════════════════════
//  STREAMS
// ═══════════════════════════════════════════════════════════════

/**
 * Notify backend that a stream has started.
 * @param {string} streamType — 'camera' | 'screen' | 'audio'
 */
export const startStream = (streamType) =>
  api.post(ENDPOINTS.STREAM_START, { streamType });

/**
 * Notify backend that a stream has stopped.
 * @param {string} sessionId
 */
export const stopStream = (sessionId) =>
  api.post(ENDPOINTS.STREAM_STOP, { sessionId });

// ═══════════════════════════════════════════════════════════════
//  HEALTH
// ═══════════════════════════════════════════════════════════════

/**
 * Check backend health.
 */
export const checkHealth = () => api.get(ENDPOINTS.HEALTH);

export default api;
