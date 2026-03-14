/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                   LOCATION SERVICE                            ║
 * ║  GPS tracking via expo-location with interval updates         ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { LOCATION_UPDATE_INTERVAL, LOCATION_DISTANCE_FILTER } from '../config/constants';
import { emitLocationUpdate } from './socketService';
import logger from '../utils/logger';

const LOCATION_TASK_NAME = 'background-location-task';
let globalOnUpdate = null;

// Define the background task globally
TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) {
    logger.error('Background Task Error', error.message);
    if (globalOnUpdate) globalOnUpdate({ error: 'PERMISSION_REVOKED' });
    return;
  }
  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      const location = locations[0];
      const { latitude, longitude, accuracy } = location.coords;
      const timestamp = new Date(location.timestamp).toISOString();

      const locationData = { latitude, longitude, accuracy, timestamp };

      // Update UI Component if attached
      if (globalOnUpdate) globalOnUpdate(locationData);

      // Tell backend directly from background service
      emitLocationUpdate(locationData, (ack) => {
         if (!ack?.success && ack?.errorCode !== 'THROTTLED') {
           logger.warn('Background Location update not acknowledged', ack);
         }
      });
    }
  }
});

/**
 * Start watching device location with configured interval.
 * @param {(location: { latitude, longitude, accuracy, timestamp }) => void} onUpdate
 * @returns {Promise<boolean>} — true if tracking started
 */
export const startTracking = async (onUpdate) => {
  try {
    const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isTaskRegistered) {
      logger.location('Task already registered, stopping first');
      await stopTracking();
    }

    // Verify permission before starting
    let permStatus = await Location.getForegroundPermissionsAsync();
    let bgStatus = await Location.getBackgroundPermissionsAsync();

    if (permStatus.status !== 'granted') {
      logger.warn('Location permission not granted');
      return false;
    }

    if (bgStatus.status !== 'granted') {
      logger.warn('Background location denied, tracking will pause when minimized.');
    }

    globalOnUpdate = onUpdate;
    logger.location('Tracking started with Native Background Service');
    
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: LOCATION_UPDATE_INTERVAL,
      distanceInterval: 0, // Force time-based updates, not distance
      deferredUpdatesInterval: LOCATION_UPDATE_INTERVAL,
      deferredUpdatesDistance: 0,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "SPY Stream Active",
        notificationBody: "Live streaming location and network traffic in the background.",
        notificationColor: "#6C63FF",
      },
      pausesUpdatesAutomatically: false,
    });

    return true;
  } catch (error) {
    logger.error('Failed to start location tracking', error.message);
    return false;
  }
};

/**
 * Stop watching device location.
 */
export const stopTracking = async () => {
  try {
    const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isTaskRegistered) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      logger.location('Native Background Tracking stopped');
    }
    globalOnUpdate = null;
  } catch (error) {
    logger.error('Failed to stop location tracking', error.message);
  }
};

/**
 * Get current position once (one-shot).
 * @returns {Promise<{ latitude, longitude, accuracy, timestamp } | null>}
 */
export const getCurrentPosition = async () => {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      timestamp: new Date(location.timestamp).toISOString(),
    };
  } catch (error) {
    logger.error('Failed to get current position', error.message);
    return null;
  }
};

/**
 * Check if tracking is currently active.
 */
export const isTracking = async () => {
  try {
    return await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  } catch {
    return false;
  }
};

export default {
  startTracking,
  stopTracking,
  getCurrentPosition,
  isTracking,
};
