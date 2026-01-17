/**
 * Pre-Keys Collection for TanStack DB
 * Handles synchronization of Signal Protocol pre-keys via Electric SQL
 */

import { createCollection } from '@tanstack/react-db';
import { electricCollectionOptions } from '@tanstack/electric-db-collection';
import { preKeySchema, type PreKeyRow } from './schemas';
import Constants from 'expo-constants';
import { ELECTRIC_CONFIG } from '@/core/electric/config';

/**
 * Pre-Keys collection with Electric SQL sync
 * Uses on-demand sync mode for sensitive data that should be loaded only when needed
 */
export const preKeysCollection = createCollection(
  electricCollectionOptions({
    id: 'pre_keys',
    schema: preKeySchema,
    getKey: (item: PreKeyRow) => item.id,
    
    // Electric shape configuration
    shapeOptions: {
      url: ELECTRIC_CONFIG.url!,
      params: {
        table: 'pre_keys',
      },
    },
    
    // Sync mode: On-demand - loads only what queries request
    // Best for large datasets and sensitive data like pre-keys
    syncMode: 'on-demand',
    
    // Mutation handlers
    onInsert: async ({ transaction }) => {
      const { changes: newPreKey } = transaction.mutations[0];
      // Pre-keys are typically created via REST API
      return { txid: Date.now() };
    },
    
    onUpdate: async ({ transaction }) => {
      const { changes: updatedPreKey } = transaction.mutations[0];
      // Handle pre-key updates
      return { txid: Date.now() };
    },
    
    onDelete: async ({ transaction }) => {
      // Handle pre-key deletion
      return { txid: Date.now() };
    },
  })
);

