/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                      HOME SCREEN                              ║
 * ║  Dashboard with 4 feature buttons + socket status header      ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { useApp } from '../context/AppContext';
import useSocket from '../hooks/useSocket';
import FeatureButton from '../components/FeatureButton';
import StatusIndicator from '../components/StatusIndicator';
import { COLORS, FONTS, SPACING, STREAM_TYPES } from '../config/constants';
import { logoutUser } from '../services/apiService';
import socketService from '../services/socketService';
import logger from '../utils/logger';

const HomeScreen = ({ navigation }) => {
  const { state, dispatch, ACTIONS } = useApp();
  const { socketStatus, isConnected } = useSocket();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          socketService.disconnect();
          await logoutUser();
          dispatch({ type: ACTIONS.CLEAR_AUTH });
          logger.info('User logged out');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Welcome back
          </Text>
          <Text style={styles.email}>
            {state.user?.email || 'User'}
          </Text>
        </View>

        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>⏻</Text>
        </TouchableOpacity>
      </View>

      {/* Connection Status Bar */}
      <View style={styles.statusBar}>
        <StatusIndicator
          status={socketStatus}
          size="small"
        />
        <Text style={styles.statusText}>
          Server {isConnected ? 'Connected' : socketStatus}
        </Text>
      </View>

      {/* Feature Buttons */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Features Summary */}
        {(state.location.tracking ||
          state.streams.camera.active ||
          state.streams.screen.active ||
          state.streams.audio.active) && (
          <View style={styles.activeSummary}>
            <Text style={styles.activeSummaryText}>
              🔴 Live sharing active
            </Text>
          </View>
        )}

        {/* Location */}
        <FeatureButton
          icon="📍"
          label="Location Sharing"
          subtitle={
            state.location.tracking
              ? `${state.location.updateCount} updates sent`
              : 'Share GPS coordinates'
          }
          isActive={state.location.tracking}
          activeColor={COLORS.success}
          onPress={() => navigation.navigate('Location')}
        />

        {/* Camera */}
        <FeatureButton
          icon="📹"
          label="Camera Stream"
          subtitle={
            state.streams.camera.active
              ? 'Streaming to dashboard'
              : 'Stream camera feed'
          }
          isActive={state.streams.camera.active}
          activeColor={COLORS.accent}
          onPress={() => navigation.navigate('Camera')}
        />

        {/* Screen Share */}
        <FeatureButton
          icon="🖥️"
          label="Screen Share"
          subtitle={
            state.streams.screen.active
              ? 'Screen is being shared'
              : 'Share device screen'
          }
          isActive={state.streams.screen.active}
          activeColor={COLORS.warning}
          onPress={() => navigation.navigate('ScreenShare')}
        />

        {/* Audio */}
        <FeatureButton
          icon="🎙️"
          label="Microphone Stream"
          subtitle={
            state.streams.audio.active
              ? 'Audio streaming active'
              : 'Stream microphone audio'
          }
          isActive={state.streams.audio.active}
          activeColor={COLORS.error}
          onPress={() => navigation.navigate('Audio')}
        />

        {/* Permissions */}
        <View style={styles.separator} />
        <TouchableOpacity
          style={styles.permissionsButton}
          onPress={() => navigation.navigate('Permissions')}
          activeOpacity={0.7}
        >
          <Text style={styles.permissionsIcon}>⚙️</Text>
          <Text style={styles.permissionsText}>Manage Permissions</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
    paddingTop: 60,
    paddingBottom: SPACING.lg,
  },
  greeting: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  email: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logoutText: {
    fontSize: 20,
    color: COLORS.textSecondary,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    marginBottom: SPACING.lg,
  },
  statusText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginLeft: SPACING.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xxl,
    paddingBottom: SPACING.section,
  },
  activeSummary: {
    backgroundColor: COLORS.error + '15',
    borderRadius: 12,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },
  activeSummaryText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    textAlign: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.lg,
  },
  permissionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  permissionsIcon: {
    fontSize: 20,
    marginRight: SPACING.md,
  },
  permissionsText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.medium,
  },
  chevron: {
    color: COLORS.textMuted,
    fontSize: 24,
    fontWeight: FONTS.weights.regular,
  },
});

export default HomeScreen;
