/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    SOCKET SERVICE                             ║
 * ║  Singleton Socket.io client — connection, events, lifecycle   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Matches backend socket events exactly:
 *  user-connected, user-disconnected, location-update,
 *  stream-start, stream-stop,
 *  webrtc-offer, webrtc-answer, ice-candidate
 */

import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/apiConfig';
import { SOCKET_OPTIONS } from '../config/constants';
import logger from '../utils/logger';

let socket = null;
let connectionListeners = [];

// ─── Connection State ───────────────────────────────────────────
const notifyConnectionListeners = (status) => {
  connectionListeners.forEach((cb) => cb(status));
};

/**
 * Subscribe to connection state changes.
 * @param {(status: 'connected'|'disconnected'|'reconnecting'|'error') => void} callback
 * @returns {() => void} unsubscribe function
 */
export const onConnectionChange = (callback) => {
  connectionListeners.push(callback);
  return () => {
    connectionListeners = connectionListeners.filter((cb) => cb !== callback);
  };
};

/**
 * Connect to the backend socket server with JWT authentication.
 * @param {string} token — JWT token
 */
export const connect = (token) => {
  if (socket?.connected) {
    logger.socket('Already connected, skipping');
    return socket;
  }

  // Disconnect any stale instance
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    ...SOCKET_OPTIONS,
    auth: { token },
  });

  // ── Built-in connection events ────────────────────────────────
  socket.on('connect', () => {
    logger.socket('Connected', { socketId: socket.id });
    notifyConnectionListeners('connected');

    // Emit user-connected event (matches backend eventHandler)
    socket.emit('user-connected', {}, (ack) => {
      if (ack?.success) {
        logger.socket('user-connected acknowledged');
      } else {
        logger.error('user-connected failed', ack);
      }
    });
  });

  socket.on('disconnect', (reason) => {
    logger.socket(`Disconnected: ${reason}`);
    notifyConnectionListeners('disconnected');
  });

  socket.on('reconnect_attempt', (attempt) => {
    logger.socket(`Reconnect attempt #${attempt}`);
    notifyConnectionListeners('reconnecting');
  });

  socket.on('reconnect', () => {
    logger.socket('Reconnected');
    notifyConnectionListeners('connected');
  });

  socket.on('connect_error', (error) => {
    logger.error(`Socket connection error: ${error.message}`);
    notifyConnectionListeners('error');
  });

  // ── Signaling errors from backend ─────────────────────────────
  socket.on('signaling-error', (data) => {
    if (data?.errorCode === 'TARGET_OFFLINE') {
      logger.stream('Signaling: Target admin is not online', data);
    } else {
      logger.error('Signaling error from server', data);
    }
  });

  return socket;
};

/**
 * Disconnect from the socket server.
 */
export const disconnect = () => {
  if (socket) {
    // Emit user-disconnected (clean disconnect)
    socket.emit('user-disconnected', {}, () => {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
      logger.socket('Disconnected (clean)');
      notifyConnectionListeners('disconnected');
    });
  }
};

/**
 * Get the current socket instance.
 */
export const getSocket = () => socket;

/**
 * Check if socket is currently connected.
 */
export const isConnected = () => socket?.connected || false;

// ═══════════════════════════════════════════════════════════════
//  EVENT EMITTERS
// ═══════════════════════════════════════════════════════════════

/**
 * Send a location update via socket.
 * @param {{ latitude, longitude, accuracy, timestamp }} data
 */
export const emitLocationUpdate = (data, callback) => {
  if (!socket?.connected) return;
  socket.emit('location-update', data, callback);
};

/**
 * Start a stream session on the backend.
 * @param {string} streamType — 'camera' | 'screen' | 'audio'
 * @param {Function} callback — ack callback with { success, sessionId }
 */
export const emitStreamStart = (streamType, callback) => {
  if (!socket?.connected) return;
  socket.emit('stream-start', { streamType }, callback);
};

/**
 * Stop a stream session on the backend.
 * @param {string} sessionId
 * @param {Function} callback
 */
export const emitStreamStop = (sessionId, callback) => {
  if (!socket?.connected) return;
  socket.emit('stream-stop', { sessionId }, callback);
};

/**
 * Send a WebRTC offer to a target user (admin).
 */
export const emitWebRTCOffer = ({ targetUserId, offer, streamType, sessionId }) => {
  if (!socket?.connected) return;
  socket.emit('webrtc-offer', { targetUserId, offer, streamType, sessionId });
};

/**
 * Send a WebRTC answer.
 */
export const emitWebRTCAnswer = ({ targetUserId, answer, sessionId }) => {
  if (!socket?.connected) return;
  socket.emit('webrtc-answer', { targetUserId, answer, sessionId });
};

/**
 * Send an ICE candidate.
 */
export const emitICECandidate = ({ targetUserId, candidate, sessionId }) => {
  if (!socket?.connected) return;
  socket.emit('ice-candidate', { targetUserId, candidate, sessionId });
};

// ═══════════════════════════════════════════════════════════════
//  EVENT LISTENERS (register/unregister)
// ═══════════════════════════════════════════════════════════════

/**
 * Listen for incoming WebRTC offers.
 */
export const onWebRTCOffer = (callback) => {
  socket?.on('webrtc-offer', callback);
  return () => socket?.off('webrtc-offer', callback);
};

/**
 * Listen for incoming WebRTC answers.
 */
export const onWebRTCAnswer = (callback) => {
  socket?.on('webrtc-answer', callback);
  return () => socket?.off('webrtc-answer', callback);
};

/**
 * Listen for incoming ICE candidates.
 */
export const onICECandidate = (callback) => {
  socket?.on('ice-candidate', callback);
  return () => socket?.off('ice-candidate', callback);
};

/**
 * Listen for batched ICE candidates.
 */
export const onICECandidatesBatch = (callback) => {
  socket?.on('ice-candidates-batch', callback);
  return () => socket?.off('ice-candidates-batch', callback);
};

/**
 * Listen for stream started events (from admin dashboard).
 */
export const onStreamStarted = (callback) => {
  socket?.on('stream-started', callback);
  return () => socket?.off('stream-started', callback);
};

/**
 * Listen for stream stopped events.
 */
export const onStreamStopped = (callback) => {
  socket?.on('stream-stopped', callback);
  return () => socket?.off('stream-stopped', callback);
};

export default {
  connect,
  disconnect,
  getSocket,
  isConnected,
  onConnectionChange,
  emitLocationUpdate,
  emitStreamStart,
  emitStreamStop,
  emitWebRTCOffer,
  emitWebRTCAnswer,
  emitICECandidate,
  onWebRTCOffer,
  onWebRTCAnswer,
  onICECandidate,
  onICECandidatesBatch,
  onStreamStarted,
  onStreamStopped,
};
