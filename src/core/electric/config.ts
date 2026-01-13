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

  // Priority 3: Railway production URL (fallback for production builds)
  return 'wss://backend-production-38c9.up.railway.app';
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

  // Priority 3: Railway production URL (fallback for production builds)
  return 'https://backend-production-38c9.up.railway.app';
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

