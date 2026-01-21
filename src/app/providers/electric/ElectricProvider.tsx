/**
 * Electric SQL Provider
 * React context provider for Electric SQL client
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initElectricClient, disconnectElectricClient, getElectricClient, isElectricConnected, ElectricClient } from './electricClient';
import { useAuth } from '@/features/auth';

interface ElectricContextValue {
  client: ElectricClient | null;
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
}

const ElectricContext = createContext<ElectricContextValue | undefined>(undefined);

interface ElectricProviderProps {
  children: ReactNode;
}

export function ElectricProvider({ children }: ElectricProviderProps) {
  const { user } = useAuth();
  const [client, setClient] = useState<ElectricClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const connect = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // This effectively just checks if the server is reachable
        const electricClient = await initElectricClient(user.id);
        
        if (mounted) {
          setClient(electricClient);
          setIsConnected(true);
          setIsLoading(false);
        }

        // Note: Event listeners removed as we are using a simplified connectivity check
        // Real-time status is handled via polling isElectricConnected() below

      } catch (err) {
        if (mounted) {
          const error = err as Error;
          console.warn('⚠️ Electric SQL não disponível:', error.message);
          console.warn('   App funcionará offline, mas sem sincronização em tempo real');
          setError(error);
          setIsLoading(false);
          setIsConnected(false);
          // Don't set client to null - allow app to work offline
          // We can still provide the disconnect method if needed
          setClient(getElectricClient());
        }
      }
    };

    connect();

    return () => {
      mounted = false;
      if (client) {
        disconnectElectricClient().catch(console.error);
      }
    };
  }, [user?.id]);

  // Update connection status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setIsConnected(isElectricConnected());
    }, 2000); // Check every 2s

    return () => clearInterval(interval);
  }, []);

  const value: ElectricContextValue = {
    client,
    isConnected,
    isLoading,
    error,
  };

  return <ElectricContext.Provider value={value}>{children}</ElectricContext.Provider>;
}

/**
 * Hook to use Electric client
 */
export function useElectric(): ElectricContextValue {
  const context = useContext(ElectricContext);
  if (context === undefined) {
    throw new Error('useElectric must be used within ElectricProvider');
  }
  return context;
}

