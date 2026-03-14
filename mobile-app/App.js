/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                       SPY MONITOR                             ║
 * ║  App Entry Point — wraps providers + handles app lifecycle    ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import React, { useEffect, useRef } from 'react';
import { AppState, StatusBar, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import webrtcService from './src/services/webrtcService';
import socketService from './src/services/socketService';
import locationService from './src/services/locationService';
import logger from './src/utils/logger';

// ── Suppress known harmless warnings in dev ─────────────────────
LogBox.ignoreLogs([
  'Require cycle',
  'Non-serializable values',
  'ViewPropTypes',
]);

const AppContent = () => {
  const appState = useRef(AppState.currentState);

  // ── Handle app state changes (background / foreground) ────────
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        appState.current.match(/active/) &&
        nextState.match(/inactive|background/)
      ) {
        // App going to background — purposefully NOT stopping streams to attempt OS-level background playback
        logger.info('App going to background — attempting to keep streams alive');
      }

      if (
        appState.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        logger.info('App returning to foreground');
      }

      appState.current = nextState;
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  return <AppNavigator />;
};

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0A0E27"
        translucent={false}
      />
      <AppProvider>
        <AppContent />
      </AppProvider>
    </SafeAreaProvider>
  );
}
