/**
 * Electric SQL Client
 * Manages connection to Electric SQL service for real-time data synchronization
 */

import { ELECTRIC_CONFIG } from './config';

// Define a simplified client interface or use void since we don't need the object
export type ElectricClient = {
  disconnect: () => Promise<void>;
  isConnected: () => boolean;
};

let isConnected = false;

/**
 * Initialize Electric client (Connectivity Check)
 */
export async function initElectricClient(userId?: string): Promise<ElectricClient> {
  console.log('⚡ Checking Electric SQL connection...');
  console.log(`📡 Electric URL: ${ELECTRIC_CONFIG.url}`);

  try {
    // perform a simple health check or shape request HEAD to verify connectivity
    // Using the API URL (without /v1/shape) usually exposes a health or root endpoint
    // But since we are using /v1/shape, let's just assume it's fine if we can reach it
    // or rely on TanStack DB to handle the connection errors.
    
    // For now, we'll optimistically assume connection is established if configuration is present.
    // In a real v1 setup, individual ShapeStreams manage their own connections.
    
    // We can try to fetch the shape URL with a HEAD request to see if it's reachable
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

    const response = await fetch(ELECTRIC_CONFIG.url!, { 
      method: 'HEAD',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    // Note: 400/404 might be expected if no params provided, but 500 or network error is bad.
    // We'll consider it "connected" if we get a response (even error) from the server,
    // meaning the server is reachable.
    
    isConnected = true;
    console.log('✅ Electric server is reachable');

    return {
      disconnect: async () => {
        isConnected = false;
        console.log('✅ Electric client disconnected (logical)');
      },
      isConnected: () => isConnected
    };
  } catch (error) {
    console.error('❌ Failed to connect to Electric server:', error);
    console.warn('⚠️ Electric SQL não disponível. App funcionará offline, mas sem sincronização em tempo real.');
    isConnected = false;
    throw error;
  }
}

/**
 * Get Electric client instance (Mock)
 */
export function getElectricClient(): ElectricClient | null {
  return {
    disconnect: async () => { isConnected = false; },
    isConnected: () => isConnected
  };
}

/**
 * Disconnect Electric client
 */
export async function disconnectElectricClient(): Promise<void> {
  isConnected = false;
  console.log('✅ Electric client disconnected');
}

/**
 * Check if Electric client is connected
 */
export function isElectricConnected(): boolean {
  return isConnected;
}

