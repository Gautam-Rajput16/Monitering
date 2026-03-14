/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                     APP CONTEXT                               ║
 * ║  Global state via React Context + useReducer                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * State slices:
 *  • user — auth token, userId, email, role
 *  • socket — connection status
 *  • streams — active stream states { camera, screen, audio }
 *  • location — tracking active, last coordinates
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/constants';
import logger from '../utils/logger';

// ─── Initial State ──────────────────────────────────────────────
const initialState = {
  // Auth
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  // Socket
  socketStatus: 'disconnected', // connected | disconnected | reconnecting | error

  // Streams
  streams: {
    camera: { active: false, sessionId: null },
    screen: { active: false, sessionId: null },
    audio: { active: false, sessionId: null },
  },

  // Location
  location: {
    tracking: false,
    latitude: null,
    longitude: null,
    accuracy: null,
    lastUpdate: null,
    updateCount: 0,
  },
};

// ─── Action Types ───────────────────────────────────────────────
const ACTIONS = {
  SET_AUTH: 'SET_AUTH',
  CLEAR_AUTH: 'CLEAR_AUTH',
  SET_LOADING: 'SET_LOADING',
  SET_SOCKET_STATUS: 'SET_SOCKET_STATUS',
  SET_STREAM_ACTIVE: 'SET_STREAM_ACTIVE',
  SET_STREAM_INACTIVE: 'SET_STREAM_INACTIVE',
  SET_LOCATION_TRACKING: 'SET_LOCATION_TRACKING',
  UPDATE_LOCATION: 'UPDATE_LOCATION',
  STOP_LOCATION: 'STOP_LOCATION',
};

// ─── Reducer ────────────────────────────────────────────────────
const appReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_AUTH:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };

    case ACTIONS.CLEAR_AUTH:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };

    case ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };

    case ACTIONS.SET_SOCKET_STATUS:
      return { ...state, socketStatus: action.payload };

    case ACTIONS.SET_STREAM_ACTIVE:
      return {
        ...state,
        streams: {
          ...state.streams,
          [action.payload.streamType]: {
            active: true,
            sessionId: action.payload.sessionId,
          },
        },
      };

    case ACTIONS.SET_STREAM_INACTIVE:
      return {
        ...state,
        streams: {
          ...state.streams,
          [action.payload.streamType]: {
            active: false,
            sessionId: null,
          },
        },
      };

    case ACTIONS.SET_LOCATION_TRACKING:
      return {
        ...state,
        location: { ...state.location, tracking: action.payload },
      };

    case ACTIONS.UPDATE_LOCATION:
      return {
        ...state,
        location: {
          ...state.location,
          ...action.payload,
          lastUpdate: new Date().toISOString(),
          updateCount: state.location.updateCount + 1,
        },
      };

    case ACTIONS.STOP_LOCATION:
      return {
        ...state,
        location: { ...initialState.location },
      };

    default:
      return state;
  }
};

// ─── Context ────────────────────────────────────────────────────
const AppContext = createContext();

/**
 * AppProvider — wraps the app with global state.
 */
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // ── Auto-restore auth from AsyncStorage on mount ──────────────
  useEffect(() => {
    const restoreAuth = async () => {
      try {
        const [token, userData] = await AsyncStorage.multiGet([
          STORAGE_KEYS.AUTH_TOKEN,
          STORAGE_KEYS.USER_DATA,
        ]);

        if (token[1] && userData[1]) {
          dispatch({
            type: ACTIONS.SET_AUTH,
            payload: {
              token: token[1],
              user: JSON.parse(userData[1]),
            },
          });
          logger.info('Auth restored from storage');
        } else {
          dispatch({ type: ACTIONS.SET_LOADING, payload: false });
        }
      } catch (error) {
        logger.error('Failed to restore auth', error.message);
        dispatch({ type: ACTIONS.SET_LOADING, payload: false });
      }
    };

    restoreAuth();
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch, ACTIONS }}>
      {children}
    </AppContext.Provider>
  );
};

/**
 * useApp — hook to access the global app state & dispatch.
 */
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export { ACTIONS };
export default AppContext;
