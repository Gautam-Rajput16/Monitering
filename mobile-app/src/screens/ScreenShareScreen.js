/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                  SCREEN SHARE SCREEN                          ║
 * ║  Start/stop screen sharing via WebRTC getDisplayMedia         ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import useWebRTC from '../hooks/useWebRTC';
import StatusIndicator from '../components/StatusIndicator';
import { COLORS, FONTS, SPACING, STREAM_TYPES } from '../config/constants';
import logger from '../utils/logger';

const ScreenShareScreen = () => {
  const { streams, startStream, stopStream } = useWebRTC();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState('00:00');

  const isActive = streams.screen.active;

  // ── Elapsed timer ─────────────────────────────────────────────
  useEffect(() => {
    let interval;
    if (isActive && startTime) {
      interval = setInterval(() => {
        const diff = Math.floor((Date.now() - startTime) / 1000);
        const mins = String(Math.floor(diff / 60)).padStart(2, '0');
        const secs = String(diff % 60).padStart(2, '0');
        setElapsed(`${mins}:${secs}`);
      }, 1000);
    } else {
      setElapsed('00:00');
    }
    return () => clearInterval(interval);
  }, [isActive, startTime]);

  const handleToggle = async () => {
    setError(null);
    setIsLoading(true);

    try {
      if (isActive) {
        await stopStream(STREAM_TYPES.SCREEN);
        setStartTime(null);
      } else {
        await startStream(STREAM_TYPES.SCREEN);
        setStartTime(Date.now());
      }
    } catch (err) {
      const message = err.message || 'Failed to toggle screen share';
      setError(message);
      Alert.alert('Screen Share Error', message);
      logger.error('Screen share toggle error', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isActive) {
        stopStream(STREAM_TYPES.SCREEN);
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
          label={isActive ? 'Screen Being Shared' : 'Screen Share Inactive'}
          size="large"
        />
      </View>

      {/* Visual Display */}
      <View style={styles.displayCard}>
        <View style={styles.screenIconContainer}>
          <Text style={styles.screenIcon}>
            {isActive ? '🖥️' : '📱'}
          </Text>
        </View>

        {isActive ? (
          <>
            <Text style={styles.sharingText}>
              Your screen is being shared
            </Text>
            <View style={styles.timerContainer}>
              <Text style={styles.timerLabel}>Duration</Text>
              <Text style={styles.timerValue}>{elapsed}</Text>
            </View>
            <View style={styles.warningBadge}>
              <Text style={styles.warningText}>
                ⚠️  Everything on your screen is visible to the admin
              </Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.inactiveTitle}>Screen Share</Text>
            <Text style={styles.inactiveSubtitle}>
              Share your device screen with the monitoring dashboard.
              The admin will be able to see everything on your screen.
            </Text>
          </>
        )}
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

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
              ? '⏹  Stop Screen Share'
              : '▶️  Start Screen Share'}
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
    paddingVertical: SPACING.xxl,
  },
  displayCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: SPACING.section,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  screenIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  screenIcon: {
    fontSize: 36,
  },
  sharingText: {
    color: COLORS.warning,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semibold,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  timerLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4,
  },
  timerValue: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.hero,
    fontWeight: FONTS.weights.bold,
    fontVariant: ['tabular-nums'],
  },
  warningBadge: {
    backgroundColor: COLORS.warning + '15',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.warning + '30',
  },
  warningText: {
    color: COLORS.warning,
    fontSize: FONTS.sizes.xs,
    textAlign: 'center',
  },
  inactiveTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
    marginBottom: SPACING.md,
  },
  inactiveSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
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
    backgroundColor: COLORS.warning,
  },
  stopButton: {
    backgroundColor: COLORS.error,
  },
  toggleText: {
    color: COLORS.background,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    letterSpacing: 0.5,
  },
});

export default ScreenShareScreen;
