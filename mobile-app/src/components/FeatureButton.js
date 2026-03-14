/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    FEATURE BUTTON                             ║
 * ║  Animated toggle button with icon, label, and state           ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  Animated,
} from 'react-native';
import { COLORS, FONTS, SPACING } from '../config/constants';

const FeatureButton = ({
  icon,
  label,
  subtitle,
  isActive = false,
  isLoading = false,
  onPress,
  activeColor = COLORS.success,
  inactiveColor = COLORS.surface,
  style,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // ── Pulsing glow when active ──────────────────────────────────
  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      glowAnim.setValue(0);
    }
  }, [isActive]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: false,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      isActive ? activeColor + '40' : COLORS.border,
      isActive ? activeColor : COLORS.border,
    ],
  });

  const shadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }],
          borderColor,
          backgroundColor: isActive ? activeColor + '10' : inactiveColor,
        },
        style,
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        disabled={isLoading}
        style={styles.touchable}
      >
        {/* Icon */}
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isActive
                ? activeColor + '20'
                : COLORS.surfaceLight,
            },
          ]}
        >
          <Text style={[styles.icon, { color: isActive ? activeColor : COLORS.textSecondary }]}>
            {icon}
          </Text>
        </View>

        {/* Text */}
        <View style={styles.textContainer}>
          <Text style={styles.label}>{label}</Text>
          {subtitle && (
            <Text style={styles.subtitle}>{subtitle}</Text>
          )}
        </View>

        {/* Status badge */}
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: isActive ? activeColor : COLORS.textMuted,
            },
          ]}
        >
          <Text style={styles.statusText}>
            {isLoading ? '...' : isActive ? 'ON' : 'OFF'}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  touchable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.lg,
  },
  icon: {
    fontSize: 22,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semibold,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    minWidth: 44,
    alignItems: 'center',
  },
  statusText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    letterSpacing: 1,
  },
});

export default FeatureButton;
