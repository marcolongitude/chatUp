import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getElectricUrl = () => {
  if (process.env.EXPO_PUBLIC_ELECTRIC_URL) {
    let url = process.env.EXPO_PUBLIC_ELECTRIC_URL;
    if (url.startsWith('ws')) url = url.replace('ws', 'http');
    if (!url.includes('/v1/shape')) url = `${url}/v1/shape`;
    return url;
  }

  if (Constants.expoConfig?.extra?.electricUrl) {
    let url = Constants.expoConfig.extra.electricUrl;
    if (url.startsWith('ws')) url = url.replace('ws', 'http');
    if (!url.includes('/v1/shape')) url = `${url}/v1/shape`;
    return url;
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      if (__DEV__) {
        console.log(`[Electric] Auto-detected Server IP: ${ip}`);
      }
      return `http://${ip}:5133/v1/shape`;
    }
  }

  if (Platform.OS === 'android' && !Constants.isDevice) {
    return 'http://10.0.2.2:5133/v1/shape';
  }

  return 'http://192.168.0.18:5133/v1/shape';
};

const getElectricApiUrl = () => {
  if (process.env.EXPO_PUBLIC_ELECTRIC_API_URL) {
    return process.env.EXPO_PUBLIC_ELECTRIC_API_URL;
  }

  if (Constants.expoConfig?.extra?.electricApiUrl) {
    return Constants.expoConfig.extra.electricApiUrl;
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      if (__DEV__) {
        console.log(`[Electric] Auto-detected API Server IP: ${ip}`);
      }
      return `http://${ip}:5133`;
    }
  }

  if (Platform.OS === 'android' && !Constants.isDevice) {
    return 'http://10.0.2.2:5133';
  }

  return 'http://192.168.0.18:5133';
};

export const ELECTRIC_CONFIG = {
  url: getElectricUrl(),
  apiUrl: getElectricApiUrl(),
  authToken: process.env.EXPO_PUBLIC_ELECTRIC_AUTH_TOKEN || undefined,
  connectTimeout: 10000,
  reconnect: {
    enabled: true,
    maxAttempts: 10,
    initialDelay: 1000,
    maxDelay: 5000,
  },
};
