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
    // Ensure it has /v1/shape if it's not present (and fix protocol if needed)
    let url = process.env.EXPO_PUBLIC_ELECTRIC_URL;
    if (url.startsWith('ws')) url = url.replace('ws', 'http');
    if (!url.includes('/v1/shape')) url = `${url}/v1/shape`;
    return url;
  }

  // Priority 2: app.config.js extra config
  if (Constants.expoConfig?.extra?.electricUrl) {
    let url = Constants.expoConfig.extra.electricUrl;
    if (url.startsWith('ws')) url = url.replace('ws', 'http');
    if (!url.includes('/v1/shape')) url = `${url}/v1/shape`;
    return url;
  }

  // Priority 3: Auto-detect from Expo's hostUri (best for development)
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      console.log(`📡 [Electric] Auto-detected Server IP: ${ip}`);
      // Use HTTP and /v1/shape for Electric Next
      return `http://${ip}:5133/v1/shape`;
    }
  }

  // Priority 4: Platform specific fallback (Emulator only)
  if (Platform.OS === 'android' && !Constants.isDevice) {
    return 'http://10.0.2.2:5133/v1/shape';
  }

  // Priority 5: Fallback to a default local IP if nothing else is found
  // This matches the default in app.config.js
  return 'http://192.168.0.18:5133/v1/shape';
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

  // Priority 3: Auto-detect from Expo's hostUri
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:5133`;
    }
  }

  // Priority 4: Platform specific fallback (Emulator only)
  if (Platform.OS === 'android' && !Constants.isDevice) {
    return 'http://10.0.2.2:5133';
  }

  // Priority 5: Default local IP
  return 'http://192.168.0.18:5133';
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

