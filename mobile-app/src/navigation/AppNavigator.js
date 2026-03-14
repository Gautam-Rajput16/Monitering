/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    APP NAVIGATOR                              ║
 * ║  Stack navigation — Login → Home → Feature screens            ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';
import { COLORS, FONTS } from '../config/constants';

// ─── Screens ────────────────────────────────────────────────────
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import LocationScreen from '../screens/LocationScreen';
import CameraScreen from '../screens/CameraScreen';
import ScreenShareScreen from '../screens/ScreenShareScreen';
import AudioScreen from '../screens/AudioScreen';
import PermissionsScreen from '../screens/PermissionsScreen';

const Stack = createNativeStackNavigator();

// ─── Default screen options (dark theme) ────────────────────────
const screenOptions = {
  headerStyle: {
    backgroundColor: COLORS.background,
  },
  headerTintColor: COLORS.textPrimary,
  headerTitleStyle: {
    fontWeight: FONTS.weights.semibold,
    fontSize: FONTS.sizes.lg,
  },
  headerShadowVisible: false,
  contentStyle: {
    backgroundColor: COLORS.background,
  },
  animation: 'slide_from_right',
};

const AppNavigator = () => {
  const { state } = useApp();

  // ── Loading splash ────────────────────────────────────────────
  if (state.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOptions}>
        {state.isAuthenticated ? (
          // ── Authenticated Stack ─────────────────────────────────
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Location"
              component={LocationScreen}
              options={{ title: 'Location Sharing' }}
            />
            <Stack.Screen
              name="Camera"
              component={CameraScreen}
              options={{ title: 'Camera Stream' }}
            />
            <Stack.Screen
              name="ScreenShare"
              component={ScreenShareScreen}
              options={{ title: 'Screen Share' }}
            />
            <Stack.Screen
              name="Audio"
              component={AudioScreen}
              options={{ title: 'Audio Stream' }}
            />
            <Stack.Screen
              name="Permissions"
              component={PermissionsScreen}
              options={{ title: 'Permissions' }}
            />
          </>
        ) : (
          // ── Auth Stack ──────────────────────────────────────────
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});

export default AppNavigator;
