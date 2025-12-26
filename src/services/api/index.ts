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

  // Priority 3: Platform-specific fallback
  if (Platform.OS === 'android') {
    // For physical devices: use LAN IP (default 192.168.0.14)
    // This allows physical devices on the same WiFi to connect.
    // Update this IP if your computer's IP changes.
    return 'http://192.168.0.14:3000'; 
  }
  
  // iOS Simulator or Web uses localhost
  return 'http://localhost:3000'; 
};

export const API_URL = getApiUrl();

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
