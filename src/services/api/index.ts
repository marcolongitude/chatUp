import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_TOKEN = 'auth.token';

// Determine API URL based on environment
const getApiUrl = () => {
  // Priority 1: Environment variable
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Priority 2: app.config.js extra config
  if (Constants.expoConfig?.extra?.apiUrl) {
    return Constants.expoConfig.extra.apiUrl;
  }

  // Priority 3: Auto-detect from Expo's hostUri (best for development)
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      console.log(`📡 [API] Auto-detectado IP do servidor: ${ip}`);
      return `http://${ip}:3000`;
    }
  }

  // Priority 4: Platform-specific fallback (Emulator only)
  // Only use 10.0.2.2 if it's an emulator. If it's a physical device,
  // it needs to hit the machine's LAN IP.
  if (Platform.OS === 'android' && !Constants.isDevice) {
    return 'http://10.0.2.2:3000'; 
  }
  
  // Priority 5: Default local IP (Ultimate fallback)
  // Replaces localhost which doesn't work for physical devices
  return 'http://192.168.0.18:3000'; 
};

export const API_URL = getApiUrl();

// Log da URL sendo usada (para debug)
console.log('🔍 [API] URL configurada:', API_URL);
console.log('🔍 [API] EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL || 'não definido');
console.log('🔍 [API] Constants.extra.apiUrl:', Constants.expoConfig?.extra?.apiUrl || 'não definido');

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
      if (token) {
        console.log(`📡 [API] Request: ${config.method?.toUpperCase()} ${config.url} with token: ${token.substring(0, 10)}...`);
        // Use .set() for better compatibility with different axios versions
        if (config.headers.set) {
            config.headers.set('Authorization', `Bearer ${token}`);
        } else {
            (config.headers as any).Authorization = `Bearer ${token}`;
        }
      } else {
        console.warn(`📡 [API] No token found for ${config.method?.toUpperCase()} ${config.url}`);
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
