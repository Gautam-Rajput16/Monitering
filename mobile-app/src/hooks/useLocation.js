/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                   useLocation HOOK                            ║
 * ║  Manages live location sharing with backend (REST + Socket)   ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import locationService from '../services/locationService';
import { Alert } from 'react-native';
import { emitLocationUpdate } from '../services/socketService';
import { requestLocationPermission } from '../permissions/locationPermission';
import logger from '../utils/logger';

const useLocation = () => {
  const { state, dispatch, ACTIONS } = useApp();
  const isStartingRef = useRef(false);

  /**
   * Start live location sharing.
   * Sends updates via Socket.io every 5s.
   */
  const startSharing = useCallback(async () => {
    if (state.location.tracking || isStartingRef.current) return;
    isStartingRef.current = true;

    try {
      // Request permission first
      const granted = await requestLocationPermission();
      if (!granted) {
        isStartingRef.current = false;
        return;
      }

      // Start GPS tracking
      const started = await locationService.startTracking((locationData) => {
        if (locationData.error) {
          dispatch({ type: ACTIONS.STOP_LOCATION });
          if (locationData.error === 'PERMISSION_REVOKED') {
            Alert.alert('Permission Revoked', 'Location tracking was stopped because location permissions were revoked.');
          } else {
            Alert.alert('Services Disabled', 'Location tracking was stopped because device location services were turned off.');
          }
          return;
        }

        // Update local state
        dispatch({
          type: ACTIONS.UPDATE_LOCATION,
          payload: {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            accuracy: locationData.accuracy,
          },
        });

        // Emit via socket (real-time)
        emitLocationUpdate(
          {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            accuracy: locationData.accuracy,
            timestamp: locationData.timestamp,
          },
          (ack) => {
            if (!ack?.success && ack?.errorCode !== 'THROTTLED') {
              logger.warn('Location update not acknowledged', ack);
            }
          }
        );
      });

      if (started) {
        dispatch({ type: ACTIONS.SET_LOCATION_TRACKING, payload: true });
        logger.location('Location sharing started');
      }
    } catch (error) {
      logger.error('Failed to start location sharing', error.message);
    } finally {
      isStartingRef.current = false;
    }
  }, [state.location.tracking, dispatch, ACTIONS]);

  /**
   * Stop live location sharing.
   */
  const stopSharing = useCallback(async () => {
    try {
      await locationService.stopTracking();
      dispatch({ type: ACTIONS.STOP_LOCATION });
      logger.location('Location sharing stopped');
    } catch (error) {
      logger.error('Failed to stop location sharing', error.message);
    }
  }, [dispatch, ACTIONS]);

  return {
    isTracking: state.location.tracking,
    latitude: state.location.latitude,
    longitude: state.location.longitude,
    accuracy: state.location.accuracy,
    lastUpdate: state.location.lastUpdate,
    updateCount: state.location.updateCount,
    startSharing,
    stopSharing,
  };
};

export default useLocation;
