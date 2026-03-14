/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    LOCATION SCREEN                            ║
 * ║  Start/stop live location sharing with coordinate display     ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import useLocation from '../hooks/useLocation';
import StatusIndicator from '../components/StatusIndicator';
import { COLORS, FONTS, SPACING } from '../config/constants';

const LocationScreen = () => {
  const {
    isTracking,
    latitude,
    longitude,
    accuracy,
    lastUpdate,
    updateCount,
    startSharing,
    stopSharing,
  } = useLocation();

  const handleToggle = async () => {
    try {
      if (isTracking) {
        await stopSharing();
      } else {
        await startSharing();
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to toggle location sharing');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Status Header */}
      <View style={styles.statusHeader}>
        <StatusIndicator
          status={isTracking ? 'active' : 'inactive'}
          label={isTracking ? 'Sharing Location' : 'Not Sharing'}
          size="large"
        />
      </View>

      {/* Map-like display area */}
      <View style={styles.coordinateCard}>
        <View style={styles.coordRow}>
          <View style={styles.coordItem}>
            <Text style={styles.coordLabel}>LATITUDE</Text>
            <Text style={styles.coordValue}>
              {latitude ? latitude.toFixed(6) : '—'}
            </Text>
          </View>
          <View style={styles.coordDivider} />
          <View style={styles.coordItem}>
            <Text style={styles.coordLabel}>LONGITUDE</Text>
            <Text style={styles.coordValue}>
              {longitude ? longitude.toFixed(6) : '—'}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Accuracy</Text>
            <Text style={styles.metaValue}>
              {accuracy ? `±${accuracy.toFixed(1)}m` : '—'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Updates Sent</Text>
            <Text style={styles.metaValue}>{updateCount}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Last Update</Text>
            <Text style={styles.metaValue}>
              {lastUpdate
                ? new Date(lastUpdate).toLocaleTimeString()
                : '—'}
            </Text>
          </View>
        </View>
      </View>

      {/* Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          {isTracking
            ? '📡  Location data is being sent to the monitoring server every 5 seconds.'
            : '📍  Press the button below to start sharing your GPS location.'}
        </Text>
      </View>

      {/* Toggle Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            isTracking ? styles.stopButton : styles.startButton,
          ]}
          onPress={handleToggle}
          activeOpacity={0.85}
        >
          <Text style={styles.toggleIcon}>
            {isTracking ? '⏹' : '▶️'}
          </Text>
          <Text style={styles.toggleText}>
            {isTracking ? 'Stop Sharing' : 'Start Sharing'}
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
  coordinateCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: SPACING.xxl,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  coordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xxl,
  },
  coordItem: {
    flex: 1,
    alignItems: 'center',
  },
  coordDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.lg,
  },
  coordLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    letterSpacing: 2,
    marginBottom: SPACING.sm,
  },
  coordValue: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
    fontVariant: ['tabular-nums'],
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.lg,
  },
  metaItem: {
    alignItems: 'center',
    flex: 1,
  },
  metaLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    marginBottom: 4,
  },
  metaValue: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
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
  buttonContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 40,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg + 2,
    borderRadius: 16,
  },
  startButton: {
    backgroundColor: COLORS.success,
  },
  stopButton: {
    backgroundColor: COLORS.error,
  },
  toggleIcon: {
    fontSize: 18,
    marginRight: SPACING.md,
  },
  toggleText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    letterSpacing: 0.5,
  },
});

export default LocationScreen;
