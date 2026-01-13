/**
 * TanStack DB Database Provider
 * Provides database context for useLiveQuery and other TanStack DB hooks
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { createDatabase, DatabaseProvider as TanStackDatabaseProvider } from '@tanstack/react-db';
import { messagesCollection, usersCollection, keysCollection, preKeysCollection } from '@/core/collections';

// Create database with all collections
const database = createDatabase({
  collections: {
    messages: messagesCollection,
    users: usersCollection,
    keys: keysCollection,
    pre_keys: preKeysCollection,
  },
});

interface DatabaseContextValue {
  database: typeof database;
}

const DatabaseContext = createContext<DatabaseContextValue | undefined>(undefined);

interface DatabaseProviderProps {
  children: ReactNode;
}

/**
 * Database Provider component
 * Wraps the app to provide TanStack DB context
 */
export function DatabaseProvider({ children }: DatabaseProviderProps) {
  return (
    <TanStackDatabaseProvider database={database}>
      {children}
    </TanStackDatabaseProvider>
  );
}

/**
 * Hook to access database instance
 */
export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within DatabaseProvider');
  }
  return context.database;
}
