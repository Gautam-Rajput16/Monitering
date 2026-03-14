/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                       LOGGER UTILITY                          ║
 * ║  Console-based logger with level prefixes and timestamps      ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  SOCKET: 'SOCKET',
  STREAM: 'STREAM',
  LOCATION: 'LOCATION',
};

const getTimestamp = () => {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour12: false });
};

const formatMessage = (level, message, data = null) => {
  const timestamp = getTimestamp();
  const prefix = `[${timestamp}] [${level}]`;
  if (data) {
    return `${prefix} ${message} ${JSON.stringify(data)}`;
  }
  return `${prefix} ${message}`;
};

const logger = {
  debug: (message, data) => {
    if (__DEV__) {
      console.log(formatMessage(LOG_LEVELS.DEBUG, message, data));
    }
  },

  info: (message, data) => {
    console.log(formatMessage(LOG_LEVELS.INFO, message, data));
  },

  warn: (message, data) => {
    console.warn(formatMessage(LOG_LEVELS.WARN, message, data));
  },

  error: (message, data) => {
    console.error(formatMessage(LOG_LEVELS.ERROR, message, data));
  },

  socket: (message, data) => {
    if (__DEV__) {
      console.log(`🔌 ${formatMessage(LOG_LEVELS.SOCKET, message, data)}`);
    }
  },

  stream: (message, data) => {
    if (__DEV__) {
      console.log(`📹 ${formatMessage(LOG_LEVELS.STREAM, message, data)}`);
    }
  },

  location: (message, data) => {
    if (__DEV__) {
      console.log(`📍 ${formatMessage(LOG_LEVELS.LOCATION, message, data)}`);
    }
  },
};

export default logger;
