/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    AUDIO SCREEN                               ║
 * ║  Start/stop microphone audio streaming via WebRTC             ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  StatusBar,
} from 'react-native';
import useWebRTC from '../hooks/useWebRTC';
import { requestMicrophonePermission } from '../permissions/microphonePermission';
import StatusIndicator from '../components/StatusIndicator';
import { COLORS, FONTS, SPACING, STREAM_TYPES } from '../config/constants';
import logger from '../utils/logger';

const AudioScreen = () => {
  const { streams, startStream, stopStream } = useWebRTC();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState('00:00');

  const isActive = streams.audio.active;

  // ── Audio level animation ─────────────────────────────────────
  const bar1 = useRef(new Animated.Value(0.3)).current;
  const bar2 = useRef(new Animated.Value(0.5)).current;
  const bar3 = useRef(new Animated.Value(0.4)).current;
  const bar4 = useRef(new Animated.Value(0.6)).current;
  const bar5 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (isActive) {
      const animateBar = (bar, delay) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(bar, {
              toValue: Math.random() * 0.7 + 0.3,
              duration: 300 + Math.random() * 200,
              useNativeDriver: false,
            }),
            Animated.timing(bar, {
              toValue: Math.random() * 0.4 + 0.1,
              duration: 300 + Math.random() * 200,
              useNativeDriver: false,
            }),
          ])
        );
      };

      const animations = [
        animateBar(bar1, 0),
        animateBar(bar2, 50),
        animateBar(bar3, 100),
        animateBar(bar4, 150),
        animateBar(bar5, 200),
      ];

      animations.forEach((a) => a.start());

      return () => animations.forEach((a) => a.stop());
    } else {
      [bar1, bar2, bar3, bar4, bar5].forEach((bar) => bar.setValue(0.15));
    }
  }, [isActive]);

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
        await stopStream(STREAM_TYPES.AUDIO);
        setStartTime(null);
      } else {
        // Request permission first
        const granted = await requestMicrophonePermission();
        if (!granted) {
          setIsLoading(false);
          return;
        }

        await startStream(STREAM_TYPES.AUDIO);
        setStartTime(Date.now());
      }
    } catch (err) {
      const message = err.message || 'Failed to toggle audio stream';
      setError(message);
      Alert.alert('Audio Error', message);
      logger.error('Audio toggle error', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isActive) {
        stopStream(STREAM_TYPES.AUDIO);
      }
    };
  }, []);

  const renderBar = (animValue, index) => {
    const height = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [8, 60],
    });

    return (
      <Animated.View
        key={index}
        style={[
          styles.audioBar,
          {
            height,
            backgroundColor: isActive ? COLORS.error : COLORS.textMuted,
          },
        ]}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Status */}
      <View style={styles.statusHeader}>
        <StatusIndicator
          status={isActive ? 'active' : 'inactive'}
          label={isActive ? 'Audio Streaming' : 'Microphone Inactive'}
          size="large"
        />
      </View>

      {/* Audio Visualizer */}
      <View style={styles.visualizerCard}>
        <View style={styles.micIconContainer}>
          <Text style={styles.micIcon}>🎙️</Text>
        </View>

        {/* Audio bars */}
        <View style={styles.barsContainer}>
          {[bar1, bar2, bar3, bar4, bar5].map((bar, i) =>
            renderBar(bar, i)
          )}
        </View>

        {/* Duration */}
        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>Duration</Text>
          <Text style={styles.timerValue}>{elapsed}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          {isActive
            ? '📡  Microphone audio is streaming to the admin dashboard via WebRTC.'
            : '🎙️  Start streaming to share your microphone audio with the monitoring dashboard.'}
        </Text>
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
              ? '⏹  Stop Audio Stream'
              : '▶️  Start Audio Stream'}
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
  visualizerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: SPACING.section,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  micIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  micIcon: {
    fontSize: 32,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 60,
    marginBottom: SPACING.xxl,
    gap: 6,
  },
  audioBar: {
    width: 8,
    borderRadius: 4,
    minHeight: 8,
  },
  timerContainer: {
    alignItems: 'center',
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
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
    fontVariant: ['tabular-nums'],
  },
  infoContainer: {
    marginTop: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  infoText: {
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
    backgroundColor: COLORS.error,
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

export default AudioScreen;
