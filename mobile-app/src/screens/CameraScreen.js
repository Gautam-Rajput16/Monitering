/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    CAMERA SCREEN                              ║
 * ║  Camera preview + WebRTC streaming to admin dashboard         ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { RTCView } from 'react-native-webrtc';
import useWebRTC from '../hooks/useWebRTC';
import { requestCameraPermission } from '../permissions/cameraPermission';
import StatusIndicator from '../components/StatusIndicator';
import { COLORS, FONTS, SPACING, STREAM_TYPES } from '../config/constants';
import logger from '../utils/logger';

const CameraScreen = () => {
  const { streams, startStream, stopStream } = useWebRTC();
  const [localStreamURL, setLocalStreamURL] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const isActive = streams.camera.active;

  const handleToggle = async () => {
    setError(null);
    setIsLoading(true);

    try {
      if (isActive) {
        await stopStream(STREAM_TYPES.CAMERA);
        setLocalStreamURL(null);
      } else {
        // Request permission first
        const granted = await requestCameraPermission();
        if (!granted) {
          setIsLoading(false);
          return;
        }

        const stream = await startStream(STREAM_TYPES.CAMERA);
        if (stream) {
          setLocalStreamURL(stream.toURL());
        }
      }
    } catch (err) {
      const message = err.message || 'Failed to toggle camera stream';
      setError(message);
      Alert.alert('Camera Error', message);
      logger.error('Camera toggle error', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isActive) {
        stopStream(STREAM_TYPES.CAMERA);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Status */}
      <View style={styles.statusHeader}>
        <StatusIndicator
          status={isActive ? 'active' : 'inactive'}
          label={isActive ? 'Streaming to Dashboard' : 'Camera Inactive'}
          size="large"
        />
      </View>

      {/* Camera Preview */}
      <View style={styles.previewContainer}>
        {localStreamURL ? (
          <RTCView
            streamURL={localStreamURL}
            style={styles.cameraPreview}
            objectFit="cover"
            mirror={true}
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderIcon}>📹</Text>
            <Text style={styles.placeholderText}>
              Camera preview will appear here
            </Text>
          </View>
        )}

        {/* Streaming overlay indicator */}
        {isActive && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {/* Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          {isActive
            ? '📡  Front camera feed is streaming to the admin dashboard via WebRTC.'
            : '📹  Start streaming to share your camera feed with the monitoring dashboard.'}
        </Text>
      </View>

      {/* Toggle Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            isActive ? styles.stopButton : styles.startButton,
          ]}
          onPress={handleToggle}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          <Text style={styles.toggleText}>
            {isLoading
              ? 'Processing...'
              : isActive
              ? '⏹  Stop Streaming'
              : '▶️  Start Streaming'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.xxl,
  },
  statusHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  previewContainer: {
    aspectRatio: 4 / 3,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    position: 'relative',
  },
  cameraPreview: {
    flex: 1,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
    opacity: 0.5,
  },
  placeholderText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
  },
  liveIndicator: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.textPrimary,
    marginRight: 6,
  },
  liveText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    letterSpacing: 1,
  },
  errorContainer: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.error + '15',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
  },
  infoContainer: {
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  infoText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 40,
  },
  toggleButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg + 2,
    borderRadius: 16,
  },
  startButton: {
    backgroundColor: COLORS.accent,
  },
  stopButton: {
    backgroundColor: COLORS.error,
  },
  toggleText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    letterSpacing: 0.5,
  },
});

export default CameraScreen;
