/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                   STATUS INDICATOR                            ║
 * ║  Pulsing dot indicator — active / inactive / error            ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS, FONTS, SPACING } from '../config/constants';

const STATUS_COLORS = {
  active: COLORS.success,
  inactive: COLORS.textMuted,
  error: COLORS.error,
  reconnecting: COLORS.warning,
  connected: COLORS.success,
  disconnected: COLORS.textMuted,
};

const STATUS_LABELS = {
  active: 'Active',
  inactive: 'Inactive',
  error: 'Error',
  reconnecting: 'Reconnecting...',
  connected: 'Connected',
  disconnected: 'Disconnected',
};

const StatusIndicator = ({
  status = 'inactive',
  label,
  size = 'medium',
  showLabel = true,
  style,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const isActive = status === 'active' || status === 'connected';
  const isReconnecting = status === 'reconnecting';

  // ── Pulse animation when active or reconnecting ───────────────
  useEffect(() => {
    if (isActive || isReconnecting) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.4,
            duration: isReconnecting ? 600 : 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: isReconnecting ? 600 : 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status]);

  const dotColor = STATUS_COLORS[status] || COLORS.textMuted;
  const displayLabel = label || STATUS_LABELS[status] || status;

  const dotSize = size === 'small' ? 8 : size === 'large' ? 14 : 10;

  return (
    <View style={[styles.container, style]}>
      {/* Pulse ring */}
      <View style={styles.dotWrapper}>
        <Animated.View
          style={[
            styles.pulseRing,
            {
              width: dotSize * 2,
              height: dotSize * 2,
              borderRadius: dotSize,
              backgroundColor: dotColor + '30',
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
        <View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: dotColor,
            },
          ]}
        />
      </View>

      {/* Label */}
      {showLabel && (
        <Text
          style={[
            styles.label,
            {
              color: dotColor,
              fontSize: size === 'small' ? FONTS.sizes.xs : FONTS.sizes.sm,
            },
          ]}
        >
          {displayLabel}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
    height: 24,
  },
  pulseRing: {
    position: 'absolute',
  },
  dot: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  label: {
    marginLeft: SPACING.sm,
    fontWeight: FONTS.weights.medium,
  },
});

export default StatusIndicator;
