/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                   API CONFIGURATION                          ║
 * ║  Base URL & endpoint constants for backend communication     ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ─── Base URL ───────────────────────────────────────────────────
// Android emulator uses 10.0.2.2 to reach host machine localhost.
// Physical devices should use your machine's LAN IP.
// Override via Expo's extra config if needed.
// ─── Environment URLs ───────────────────────────────────────────
const PROD_URL = 'https://spy-backend-yk4g.onrender.com';
const DEV_URL = (() => {
  const LOCAL_IP = '10.18.45.167'; // 🚨 Must match your laptop's IPv4
  return Platform.select({
    android: `http://${LOCAL_IP}:5000`,
    ios: `http://${LOCAL_IP}:5000`,
    default: `http://${LOCAL_IP}:5000`,
  });
})();

const getBaseUrl = () => {
  // 1. Manual override via Expo extra config (if using app.json)
  const extra = Constants.expoConfig?.extra;
  if (extra?.API_URL) return extra.API_URL;

  // 2. Automated switching between Dev and Prod
  if (__DEV__) {
    // Return DEV_URL by default in development mode
    return DEV_URL;
  }

  // 3. Fallback to Production
  return PROD_URL;
};

export const BASE_URL = getBaseUrl();
export const SOCKET_URL = BASE_URL;

// ─── API Endpoints ──────────────────────────────────────────────
export const ENDPOINTS = {
  // Auth
  AUTH_REGISTER: '/api/auth/register',
  AUTH_LOGIN: '/api/auth/login',
  AUTH_PROFILE: '/api/auth/profile',

  // Devices
  DEVICE_REGISTER: '/api/devices/register',
  DEVICES: '/api/devices',

  // Location
  LOCATION_UPDATE: '/api/location/update',
  LOCATION_LATEST: '/api/location/latest', // + /:userId
  LOCATION_HISTORY: '/api/location/history', // + /:userId

  // Streams
  STREAM_START: '/api/streams/start',
  STREAM_STOP: '/api/streams/stop',
  STREAM_ACTIVE: '/api/streams/active',
  STREAM_HISTORY: '/api/streams/history', // + /:userId

  // Health
  HEALTH: '/api/health',
};
