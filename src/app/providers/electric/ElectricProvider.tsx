import React, { useEffect, useState, type ReactNode } from 'react';
import { initElectricClient, disconnectElectricClient, getElectricClient, isElectricConnected } from './electricClient';
import { ElectricContext, type ElectricClient } from '@/shared/lib/electric';
import { useAuth } from '@/features/auth';

interface ElectricProviderProps {
  children: ReactNode;
}

export function ElectricProvider({ children }: ElectricProviderProps) {
  const { user } = useAuth();
  const [client, setClient] = useState<ElectricClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const connect = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const electricClient = await initElectricClient(user.id);

        if (mounted) {
          setClient(electricClient);
          setConnected(true);
          setLoading(false);

          if (user?.id) {
            const { checkStableKeysStatus } = require('@/shared/lib/debug/checkKeys');
            checkStableKeysStatus(user.id).catch((e: any) => console.error("Key check failed", e));
          }
        }
      } catch (err) {
        if (mounted) {
          const e = err as Error;
          console.warn('Electric SQL not available:', e.message);
          setError(e);
          setLoading(false);
          setConnected(false);
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

  useEffect(() => {
    const interval = setInterval(() => {
      setConnected(isElectricConnected());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ElectricContext.Provider value={{ client, isConnected: connected, isLoading: loading, error }}>
      {children}
    </ElectricContext.Provider>
  );
}
