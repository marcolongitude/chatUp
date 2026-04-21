import { createContext, useContext } from 'react';
import type { ElectricClient } from './types';

export interface ElectricContextValue {
  client: ElectricClient | null;
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
}

export const ElectricContext = createContext<ElectricContextValue | undefined>(undefined);

/**
 * Hook to consume Electric client state.
 * The Provider lives in `app/providers/electric` – this hook is the public
 * consumer API available to any layer >= shared.
 */
export function useElectric(): ElectricContextValue {
  const context = useContext(ElectricContext);
  if (context === undefined) {
    throw new Error('useElectric must be used within ElectricProvider');
  }
  return context;
}
