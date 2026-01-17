/**
 * Users Collection for TanStack DB
 * Handles real-time synchronization of users via Electric SQL
 */

import { createCollection } from '@tanstack/react-db';
import { electricCollectionOptions } from '@tanstack/electric-db-collection';
import { userSchema, type UserRow } from './schemas';
import { ELECTRIC_CONFIG } from '@/core/electric/config';

/**
 * Users collection with Electric SQL sync
 * Uses eager sync mode for small, mostly static data
 */
export const usersCollection = createCollection(
  electricCollectionOptions({
    id: 'users',
    schema: userSchema,
    getKey: (item: UserRow) => item.id,
    
    // Electric shape configuration
    shapeOptions: {
      url: ELECTRIC_CONFIG.url!,
      params: {
        table: 'users',
      },
    },
    
    // Sync mode: Eager - loads entire collection upfront
    // Best for <10k rows of mostly static data like user profiles
    syncMode: 'eager',
    
    // Mutation handlers
    onInsert: async ({ transaction }) => {
      const { changes: newUser } = transaction.mutations[0];
      // Users are typically created via REST API, but Electric syncs automatically
      return { txid: Date.now() };
    },
    
    onUpdate: async ({ transaction }) => {
      const { changes: updatedUser } = transaction.mutations[0];
      // Handle user profile updates
      return { txid: Date.now() };
    },
  })
);

