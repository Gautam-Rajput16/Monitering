/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                     LOGIN SCREEN                              ║
 * ║  Email/password login + auto device registration              ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { useApp } from '../context/AppContext';
import { loginUser, registerDevice } from '../services/apiService';
import { COLORS, FONTS, SPACING, STORAGE_KEYS } from '../config/constants';
import logger from '../utils/logger';

const LoginScreen = () => {
  const { dispatch, ACTIONS } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please enter both email and password.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Authenticate
      const response = await loginUser(email.trim().toLowerCase(), password);

      if (response.success) {
        const { user, token } = response.data;

        // 2. Register device if first time
        await handleDeviceRegistration(token);

        // 3. Update global state
        dispatch({
          type: ACTIONS.SET_AUTH,
          payload: { user, token },
        });

        logger.info('Login successful', { userId: user.userId });
      }
    } catch (error) {
      const message = error.message || 'Login failed. Please try again.';
      Alert.alert('Login Failed', message);
      logger.error('Login failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeviceRegistration = async () => {
    try {
      const isRegistered = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_REGISTERED);
      if (isRegistered) return;

      // Generate device ID
      const deviceId =
        Device.osBuildId ||
        `${Device.brand}-${Device.modelName}-${Date.now()}`.replace(/\s+/g, '-');

      const deviceName = `${Device.brand || 'Unknown'} ${Device.modelName || 'Device'}`;
      const osType = Platform.OS === 'ios' ? 'ios' : 'android';

      await registerDevice({ deviceId, deviceName, osType });
      await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
      await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_REGISTERED, 'true');

      logger.info('Device registered', { deviceId, deviceName });
    } catch (error) {
      // Don't block login on device registration failure
      logger.warn('Device registration failed (non-blocking)', error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.logoIcon}>🛡️</Text>
          <Text style={styles.title}>SPY Monitor</Text>
          <Text style={styles.subtitle}>
            User Monitoring Client
          </Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
              editable={!isLoading}
            />
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.textPrimary} />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footerText}>
          Secure connection to monitoring server
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.section,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoIcon: {
    fontSize: 56,
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONTS.sizes.hero,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  formContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: SPACING.xxl,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  inputWrapper: {
    marginBottom: SPACING.xl,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md + 2,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    letterSpacing: 0.5,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    marginTop: SPACING.xxl,
  },
});

export default LoginScreen;
