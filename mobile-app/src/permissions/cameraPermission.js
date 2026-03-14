/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                   CAMERA PERMISSION                           ║
 * ║  Request, check, and guide user for camera access             ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import * as Linking from 'expo-linking';
import { Alert, Platform, PermissionsAndroid } from 'react-native';
import logger from '../utils/logger';

/**
 * Request camera permission.
 * @returns {Promise<boolean>} true if granted
 */
export const requestCameraPermission = async () => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission Required',
          message: 'SPY app needs access to your camera to stream video.',
          buttonPositive: 'OK',
          buttonNegative: 'Cancel',
        }
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        logger.info('Camera permission granted');
        return true;
      }

      logger.warn('Camera permission denied');
      showPermissionDeniedAlert('Camera');
      return false;
    } catch (err) {
      logger.error('Camera permission request error', err.message);
      return false;
    }
  } else {
    // iOS: WebRTC's getUserMedia prompts automatically.
    return true;
  }
};

/**
 * Check current camera permission status.
 * @returns {Promise<'granted'|'denied'|'undetermined'>}
 */
export const checkCameraPermission = async () => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
      return granted ? 'granted' : 'denied';
    } catch (err) {
      return 'undetermined';
    }
  }
  return 'undetermined';
};

/**
 * Show alert guiding user to enable permission in settings.
 */
const showPermissionDeniedAlert = (permissionType) => {
  Alert.alert(
    `${permissionType} Permission Required`,
    `${permissionType} access is needed for streaming. Please enable it in your device settings.`,
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
  requestCameraPermission,
  checkCameraPermission,
};
