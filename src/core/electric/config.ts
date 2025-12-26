/**
 * Electric SQL Client Configuration
 * Configuration for connecting to Electric SQL service
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Determine Electric URL based on environment (similar to API_URL logic)
const getElectricUrl = () => {
  // Priority 1: Environment variable
  if (process.env.EXPO_PUBLIC_ELECTRIC_URL) {
    return process.env.EXPO_PUBLIC_ELECTRIC_URL;
  }

  // Priority 2: app.config.js extra config
  if (Constants.expoConfig?.extra?.electricUrl) {
    return Constants.expoConfig.extra.electricUrl;
  }

  // Priority 3: Platform-specific fallback
  if (Platform.OS === 'android') {
    // For physical devices: use LAN IP (default 192.168.0.14)
    // Use same IP as API for consistency
    return 'ws://192.168.0.14:5133';
  }
  
  // iOS Simulator or Web uses localhost
  return 'ws://localhost:5133';
};

const getElectricApiUrl = () => {
  // Priority 1: Environment variable
  if (process.env.EXPO_PUBLIC_ELECTRIC_API_URL) {
    return process.env.EXPO_PUBLIC_ELECTRIC_API_URL;
  }

  // Priority 2: app.config.js extra config
  if (Constants.expoConfig?.extra?.electricApiUrl) {
    return Constants.expoConfig.extra.electricApiUrl;
  }

  // Priority 3: Platform-specific fallback
  if (Platform.OS === 'android') {
    // For physical devices: use LAN IP (default 192.168.0.14)
    return 'http://192.168.0.14:5133';
  }
  
  return 'http://localhost:5133';
};

export const ELECTRIC_CONFIG = {
  // Electric service URL (WebSocket)
  url: getElectricUrl(),
  
  // API URL for Electric HTTP endpoints
  apiUrl: getElectricApiUrl(),
  
  // Auth token (if using secure mode)
  authToken: process.env.EXPO_PUBLIC_ELECTRIC_AUTH_TOKEN || undefined,
  
  // Connection timeout in milliseconds
  connectTimeout: 10000,
  
  // Reconnection settings
  reconnect: {
    enabled: true,
    maxAttempts: 10,
    initialDelay: 1000,
    maxDelay: 5000,
  },
};

