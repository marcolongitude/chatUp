/**
 * Electric SQL Provider
 * React context provider for Electric SQL client
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initElectricClient, disconnectElectricClient, getElectricClient, isElectricConnected } from './electricClient';
import { ElectricClient } from '@electric-sql/client';
import { useAuth } from '@/modules/auth';

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

        const electricClient = await initElectricClient(user.id);
        
        if (mounted) {
          setClient(electricClient);
          setIsConnected(true);
          setIsLoading(false);
        }

        // Listen for connection changes
        electricClient.on('connect', () => {
          if (mounted) {
            setIsConnected(true);
          }
        });

        electricClient.on('disconnect', () => {
          if (mounted) {
            setIsConnected(false);
          }
        });

        electricClient.on('error', (err: Error) => {
          if (mounted) {
            setError(err);
            setIsConnected(false);
          }
        });
      } catch (err) {
        if (mounted) {
          setError(err as Error);
          setIsLoading(false);
          setIsConnected(false);
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
    }, 1000);

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

