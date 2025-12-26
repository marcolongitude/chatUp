/**
 * Electric SQL Client
 * Manages connection to Electric SQL service for real-time data synchronization
 */

import { ElectricClient } from '@electric-sql/client';
import { ELECTRIC_CONFIG } from './config';

let electricClientInstance: ElectricClient | null = null;

/**
 * Initialize Electric client
 */
export async function initElectricClient(userId?: string): Promise<ElectricClient> {
  if (electricClientInstance) {
    return electricClientInstance;
  }

  try {
    const client = new ElectricClient({
      url: ELECTRIC_CONFIG.url,
      auth: userId ? { userId } : undefined,
    });

    await client.connect();
    
    electricClientInstance = client;
    console.log('✅ Electric client connected successfully');
    
    return client;
  } catch (error) {
    console.error('❌ Failed to connect Electric client:', error);
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

