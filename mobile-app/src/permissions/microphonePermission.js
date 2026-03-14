/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                 MICROPHONE PERMISSION                         ║
 * ║  Request, check, and guide user for microphone access         ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import * as Linking from 'expo-linking';
import { Alert, Platform, PermissionsAndroid } from 'react-native';
import logger from '../utils/logger';

/**
 * Request microphone permission.
 * @returns {Promise<boolean>} true if granted
 */
export const requestMicrophonePermission = async () => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission Required',
          message: 'SPY app needs access to your microphone to stream audio.',
          buttonPositive: 'OK',
          buttonNegative: 'Cancel',
        }
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        logger.info('Microphone permission granted');
        return true;
      }

      logger.warn('Microphone permission denied');
      showPermissionDeniedAlert('Microphone');
      return false;
    } catch (err) {
      logger.error('Microphone permission request error', err.message);
      return false;
    }
  } else {
    return true;
  }
};

/**
 * Check current microphone permission status.
 * @returns {Promise<'granted'|'denied'|'undetermined'>}
 */
export const checkMicrophonePermission = async () => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
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
    `${permissionType} access is needed for audio streaming. Please enable it in your device settings.`,
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
  requestMicrophonePermission,
  checkMicrophonePermission,
};
