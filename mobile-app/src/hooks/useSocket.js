/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    useSocket HOOK                             ║
 * ║  Manages socket connection lifecycle in sync with app state   ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import socketService from '../services/socketService';
import logger from '../utils/logger';

const useSocket = () => {
  const { state, dispatch, ACTIONS } = useApp();
  const unsubRef = useRef(null);

  // ── Connect when authenticated, disconnect when not ───────────
  useEffect(() => {
    if (state.isAuthenticated && state.token) {
      // Connect to socket
      socketService.connect(state.token);

      // Subscribe to connection state changes
      unsubRef.current = socketService.onConnectionChange((status) => {
        dispatch({ type: ACTIONS.SET_SOCKET_STATUS, payload: status });
      });

      return () => {
        unsubRef.current?.();
        socketService.disconnect();
      };
    }
  }, [state.isAuthenticated, state.token]);

  /**
   * Manually reconnect (useful after network recovery).
   */
  const reconnect = useCallback(() => {
    if (state.token) {
      socketService.disconnect();
      setTimeout(() => {
        socketService.connect(state.token);
      }, 500);
    }
  }, [state.token]);

  return {
    socketStatus: state.socketStatus,
    isConnected: state.socketStatus === 'connected',
    reconnect,
    socket: socketService.getSocket(),
  };
};

export default useSocket;
