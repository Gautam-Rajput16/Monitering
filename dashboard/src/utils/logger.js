// Logger utility for consistent debugging
export const logger = {
  info: (message, data = '') => {
    if (import.meta.env.DEV) {
      console.log(`ℹ️ [INFO]: ${message}`, data);
    }
  },
  warn: (message, data = '') => {
    console.warn(`⚠️ [WARN]: ${message}`, data);
  },
  error: (message, error = '') => {
    console.error(`❌ [ERROR]: ${message}`, error);
  },
  socket: (event, data = '') => {
    if (import.meta.env.DEV) {
      console.log(`🔌 [SOCKET ${event}]:`, data);
    }
  },
  webrtc: (message, data = '') => {
    if (import.meta.env.DEV) {
      console.log(`🎥 [WebRTC]: ${message}`, data);
    }
  }
};
