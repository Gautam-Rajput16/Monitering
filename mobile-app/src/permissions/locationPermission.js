/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                  LOCATION PERMISSION                          ║
 * ║  Request, check, and guide user for location access           ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import * as Location from 'expo-location';
import * as Linking from 'expo-linking';
import { Alert, Platform } from 'react-native';
import logger from '../utils/logger';

/**
 * Request foreground location permission.
 * @returns {Promise<boolean>} true if granted
 */
export const requestLocationPermission = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status === 'granted') {
      logger.info('Foreground location permission granted');
      
      // Request background permission for TaskManager (Required for Android Foreground Service)
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      
      if (bgStatus === 'granted') {
        logger.info('Background location permission granted');
        return true;
      }
      
      logger.warn('Background location permission denied');
      // We can still return true if we fallback to foreground-only, but let's notify
      // showPermissionDeniedAlert('Background Location');
      return true; // Return true as we can still do foreground tracking, but background might die
    }

    logger.warn('Location permission denied');
    showPermissionDeniedAlert('Location');
    return false;
  } catch (error) {
    logger.error('Location permission error', error.message);
    return false;
  }
};

/**
 * Check current location permission status.
 * @returns {Promise<'granted'|'denied'|'undetermined'>}
 */
export const checkLocationPermission = async () => {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status;
};

/**
 * Show alert guiding user to enable permission in settings.
 */
const showPermissionDeniedAlert = (permissionType) => {
  Alert.alert(
    `${permissionType} Permission Required`,
    `${permissionType} access is needed for this feature. Please enable it in your device settings.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open Settings',
        onPress: () => {
          if (Platform.OS === 'ios') {
            Linking.openURL('app-settings:');
          } else {
            Linking.openSettings();
          }
        },
      },
    ]
  );
};

export default {
  requestLocationPermission,
  checkLocationPermission,
};
