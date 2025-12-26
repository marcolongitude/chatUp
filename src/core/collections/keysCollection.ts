/**
 * Keys Collection for TanStack DB
 * Handles synchronization of Signal Protocol keys via Electric SQL
 */

import { createCollection } from '@tanstack/react-db';
import { electricCollectionOptions } from '@tanstack/electric-db-collection';
import { keySchema, type KeyRow } from './schemas';

/**
 * Keys collection with Electric SQL sync
 * Uses on-demand sync mode for sensitive data that should be loaded only when needed
 */
export const keysCollection = createCollection(
  electricCollectionOptions({
    id: 'keys',
    schema: keySchema,
    getKey: (item: KeyRow) => item.user_id,
    
    // Electric shape configuration
    shapeOptions: {
      url: process.env.EXPO_PUBLIC_ELECTRIC_API_URL || 'http://localhost:5133',
      params: {
        table: 'keys',
      },
    },
    
    // Sync mode: On-demand - loads only what queries request
    // Best for large datasets (>50k rows) and sensitive data like encryption keys
    syncMode: 'on-demand',
    
    // Mutation handlers
    onInsert: async ({ transaction }) => {
      const { changes: newKey } = transaction.mutations[0];
      // Keys are typically created via REST API
      return { txid: `tx_${Date.now()}` };
    },
    
    onUpdate: async ({ transaction }) => {
      const { changes: updatedKey } = transaction.mutations[0];
      // Handle key updates
      return { txid: `tx_${Date.now()}` };
    },
  })
);

