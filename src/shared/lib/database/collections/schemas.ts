/**
 * Zod Schemas for TanStack DB Collections
 * These schemas validate data structure for Electric SQL sync
 */

import { z } from 'zod';

// Message schema
export const messageSchema = z.object({
  id: z.string().uuid(),
  sender_id: z.string().uuid(),
  receiver_id: z.string().uuid(),
  content: z.string(), // Encrypted content
  timestamp: z.date(),
  is_delivered: z.boolean().default(false),
  is_read: z.boolean().default(false),
});

export type MessageRow = z.infer<typeof messageSchema>;

// User schema
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  password_hash: z.string(), // Not synced to client, but in schema for completeness
  display_name: z.string().nullable().optional(),
  photo_url: z.string().nullable().optional(),
  phone_number: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  public_key: z.string().nullable().optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

export type UserRow = z.infer<typeof userSchema>;

// Key schema (Signal Protocol)
export const keySchema = z.object({
  user_id: z.string().uuid(),
  identity_key: z.string(),
  public_key: z.string().nullable().optional(),
  registration_id: z.number(),
  signed_pre_key: z.object({
    keyId: z.number(),
    publicKey: z.string(),
    signature: z.string(),
  }),
  updated_at: z.date(),
});

export type KeyRow = z.infer<typeof keySchema>;

// Pre-key schema
export const preKeySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  key_id: z.number(),
  public_key: z.string(),
});

export type PreKeyRow = z.infer<typeof preKeySchema>;

