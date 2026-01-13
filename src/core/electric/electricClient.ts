/**
 * Electric SQL Client
 * Manages connection to Electric SQL service for real-time data synchronization
 */

import { ElectricClient } from '@electric-sql/client';
import { ELECTRIC_CONFIG } from './config';

let electricClientInstance: ElectricClient | null = null;

/**
 * Initialize Electric client with offline-first support
 */
export async function initElectricClient(userId?: string): Promise<ElectricClient> {
  if (electricClientInstance) {
    return electricClientInstance;
  }

  try {
    const client = new ElectricClient({
      url: ELECTRIC_CONFIG.url,
      auth: userId ? { userId } : undefined,
      // Offline-first configuration
      // Electric will work offline using local SQLite database
      // and sync when connection is available
    });

    // Connect with timeout
    const connectPromise = client.connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), ELECTRIC_CONFIG.connectTimeout)
    );

    await Promise.race([connectPromise, timeoutPromise]);
    
    electricClientInstance = client;
    console.log('✅ Electric client connected successfully');
    console.log(`📡 Electric URL: ${ELECTRIC_CONFIG.url}`);
    
    return client;
  } catch (error) {
    console.error('❌ Failed to connect Electric client:', error);
    console.warn('⚠️ Electric SQL não disponível. App funcionará offline, mas sem sincronização em tempo real.');
    // Don't throw - allow app to work offline
    // The app should handle this gracefully
    throw error;
  }
}

/**
 * Get Electric client instance
 */
export function getElectricClient(): ElectricClient | null {
  return electricClientInstance;
}

/**
 * Disconnect Electric client
 */
export async function disconnectElectricClient(): Promise<void> {
  if (electricClientInstance) {
    await electricClientInstance.disconnect();
    electricClientInstance = null;
    console.log('✅ Electric client disconnected');
  }
}

/**
 * Check if Electric client is connected
 */
export function isElectricConnected(): boolean {
  return electricClientInstance?.isConnected() ?? false;
}

