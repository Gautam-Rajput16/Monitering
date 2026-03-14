/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                  PERMISSIONS SCREEN                           ║
 * ║  Display permission statuses and provide request buttons      ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import {
  requestLocationPermission,
  checkLocationPermission,
} from '../permissions/locationPermission';
import {
  requestCameraPermission,
  checkCameraPermission,
} from '../permissions/cameraPermission';
import {
  requestMicrophonePermission,
  checkMicrophonePermission,
} from '../permissions/microphonePermission';
import { COLORS, FONTS, SPACING } from '../config/constants';

const STATUS_CONFIG = {
  granted: { color: COLORS.success, label: 'Granted', icon: '✅' },
  denied: { color: COLORS.error, label: 'Denied', icon: '❌' },
  undetermined: { color: COLORS.warning, label: 'Not Requested', icon: '⏳' },
};

const PermissionsScreen = () => {
  const [permissions, setPermissions] = useState({
    location: 'undetermined',
    camera: 'undetermined',
    microphone: 'undetermined',
  });
  const [refreshing, setRefreshing] = useState(false);

  const checkAllPermissions = useCallback(async () => {
    const [location, camera, microphone] = await Promise.all([
      checkLocationPermission(),
      checkCameraPermission(),
      checkMicrophonePermission(),
    ]);

    setPermissions({ location, camera, microphone });
  }, []);

  useEffect(() => {
    checkAllPermissions();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await checkAllPermissions();
    setRefreshing(false);
  };

  const handleRequest = async (type) => {
    let granted = false;

    switch (type) {
      case 'location':
        granted = await requestLocationPermission();
        break;
      case 'camera':
        granted = await requestCameraPermission();
        break;
      case 'microphone':
        granted = await requestMicrophonePermission();
        break;
    }

    // Refresh all permission statuses
    await checkAllPermissions();
  };

  const renderPermissionRow = (key, label, icon, description) => {
    const status = permissions[key];
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.undetermined;

    return (
      <View key={key} style={styles.permissionCard}>
        <View style={styles.permissionHeader}>
          <View style={styles.permissionInfo}>
            <Text style={styles.permissionIcon}>{icon}</Text>
            <View>
              <Text style={styles.permissionLabel}>{label}</Text>
              <Text style={styles.permissionDesc}>{description}</Text>
            </View>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: config.color + '20' },
            ]}
          >
            <Text style={{ color: config.color, fontSize: 12 }}>
              {config.icon} {config.label}
            </Text>
          </View>
        </View>

        {status !== 'granted' && (
          <TouchableOpacity
            style={styles.requestButton}
            onPress={() => handleRequest(key)}
            activeOpacity={0.7}
          >
            <Text style={styles.requestButtonText}>
              {status === 'denied' ? 'Open Settings' : 'Request Permission'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <Text style={styles.headerTitle}>App Permissions</Text>
        <Text style={styles.headerSubtitle}>
          The following permissions are required for the app's monitoring
          features. All features require explicit user consent.
        </Text>

        {/* Permission Rows */}
        {renderPermissionRow(
          'location',
          'Location',
          '📍',
          'Required for GPS tracking and live location sharing'
        )}

        {renderPermissionRow(
          'camera',
          'Camera',
          '📹',
          'Required for camera streaming to the admin dashboard'
        )}

        {renderPermissionRow(
          'microphone',
          'Microphone',
          '🎙️',
          'Required for audio streaming to the admin dashboard'
        )}

        {/* Screen capture note */}
        <View style={styles.noteCard}>
          <Text style={styles.noteIcon}>🖥️</Text>
          <View style={styles.noteContent}>
            <Text style={styles.noteTitle}>Screen Capture</Text>
            <Text style={styles.noteText}>
              Screen capture permission is requested at the time of use via the
              Android system dialog. It cannot be pre-granted.
            </Text>
          </View>
        </View>

        {/* Privacy notice */}
        <View style={styles.privacyCard}>
          <Text style={styles.privacyTitle}>🔒 Privacy Notice</Text>
          <Text style={styles.privacyText}>
            All monitoring features show a visible indicator when active.
            Streams are stopped when the app is closed or backgrounded.
            No data is collected without your explicit action.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xxl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.section,
  },
  headerTitle: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  headerSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.xxl,
  },
  permissionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  permissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  permissionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  permissionIcon: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  permissionLabel: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semibold,
  },
  permissionDesc: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
    maxWidth: 180,
  },
  statusBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
  },
  requestButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary + '20',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  requestButtonText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
  },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  noteIcon: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  noteContent: {
    flex: 1,
  },
  noteTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semibold,
    marginBottom: 4,
  },
  noteText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    lineHeight: 18,
  },
  privacyCard: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: 16,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  privacyTitle: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    marginBottom: SPACING.sm,
  },
  privacyText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    lineHeight: 20,
  },
});

export default PermissionsScreen;
