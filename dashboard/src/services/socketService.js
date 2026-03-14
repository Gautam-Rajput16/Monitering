import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/apiConfig';
import { logger } from '../utils/logger';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.isConnected = false;
  }

  // Initialize socket connection
  connect(token) {
    if (this.socket?.connected) return;

    logger.info('Initializing socket connection...', SOCKET_URL);
    
    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
      reconnection: true,     // Reconnection logic
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      logger.socket('connect', `Connected with ID: ${this.socket.id}`);
      this._emitRegisteredListeners('connect');
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      logger.warn(`🔌 Socket disconnected: ${reason}`);
      this._emitRegisteredListeners('disconnect', reason);
    });

    this.socket.on('connect_error', (error) => {
      logger.error('🔌 Socket connection error', error.message);
      this._emitRegisteredListeners('connect_error', error);
    });

    // Register backend socket events specifically listed in user requirements
    const coreEvents = [
      'user-connected',
      'user-disconnected',
      'location-update',
      'stream-start',
      'stream-stop',
      'webrtc-offer',
      'webrtc-answer',
      'ice-candidate'
    ];

    coreEvents.forEach((event) => {
      this.socket.on(event, (data) => {
        logger.socket(event, data);
        this._emitRegisteredListeners(event, data);
      });
    });
  }

  // Disconnect manually
  disconnect() {
    if (this.socket) {
      logger.info('Disconnecting socket manually...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Component-level Subscriptions
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback); // Return unsubscribe function
  }

  // Remove listener
  off(event, callback) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  // Internal trigger for registered listeners
  _emitRegisteredListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          logger.error(`Error in listener for event ${event}`, err);
        }
      });
    }
  }

  // Method to emit events back to the server (like answer to offer)
  emit(event, data) {
    if (this.socket?.connected) {
      // Don't spam logger for frequent ICE candidates or location updates
      if (event !== 'ice-candidate') {
          logger.socket(`Emiting ${event}`, data);
      }
      this.socket.emit(event, data);
    } else {
      logger.error(`Cannot emit event ${event}, socket is not connected.`);
    }
  }
}

// Ensure single instance pattern
const socketService = new SocketService();
export default socketService;
