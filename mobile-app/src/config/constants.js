/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                     APP CONSTANTS                             ║
 * ║  Shared configuration values for the mobile application       ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

// ─── Location Tracking ─────────────────────────────────────────
export const LOCATION_UPDATE_INTERVAL = 5000; // 5 seconds
export const LOCATION_DISTANCE_FILTER = 5; // meters — minimum movement before update

// ─── WebRTC ICE Servers ─────────────────────────────────────────
export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

// ─── Socket.io ──────────────────────────────────────────────────
export const SOCKET_OPTIONS = {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  timeout: 20000,
  transports: ['websocket', 'polling'],
};

// ─── Stream Types ───────────────────────────────────────────────
export const STREAM_TYPES = {
  CAMERA: 'camera',
  SCREEN: 'screen',
  AUDIO: 'audio',
};

// ─── App Info ───────────────────────────────────────────────────
export const APP_NAME = 'SPY Monitor';
export const APP_VERSION = '1.0.0';

// ─── Storage Keys ───────────────────────────────────────────────
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@spy_auth_token',
  USER_DATA: '@spy_user_data',
  DEVICE_ID: '@spy_device_id',
  DEVICE_REGISTERED: '@spy_device_registered',
};

// ─── Colors ─────────────────────────────────────────────────────
export const COLORS = {
  // Primary palette
  primary: '#6C63FF',
  primaryDark: '#5A52D5',
  primaryLight: '#8B83FF',

  // Accent
  accent: '#00D9FF',
  accentDark: '#00B8D9',

  // Status
  success: '#00E676',
  warning: '#FFD600',
  error: '#FF5252',
  info: '#448AFF',

  // Backgrounds
  background: '#0A0E27',
  surface: '#141833',
  surfaceLight: '#1E2346',
  card: '#1A1F3D',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A3BD',
  textMuted: '#6B6F8D',

  // Borders
  border: '#2A2F52',
  borderLight: '#3A3F62',

  // Glass effect
  glass: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
};

// ─── Typography ─────────────────────────────────────────────────
export const FONTS = {
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
    title: 28,
    hero: 34,
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

// ─── Spacing ────────────────────────────────────────────────────
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 32,
};
