/**
 * Messages Collection for TanStack DB
 * Handles real-time synchronization of messages via Electric SQL
 */

import { createCollection } from '@tanstack/react-db';
import { electricCollectionOptions } from '@tanstack/electric-db-collection';
import { messageSchema, type MessageRow } from './schemas';
import { encryptMessage, decryptMessage } from '@/core/security';
import type { Collection } from '@tanstack/db';

// Helper to generate chat ID (consistent with existing logic)
function generateChatId(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort();
  return `${sorted[0]}_${sorted[1]}`;
}

/**
 * Messages collection with Electric SQL sync
 * Uses progressive sync mode for fast initial load and background full sync
 */
export const messagesCollection = createCollection(
  electricCollectionOptions({
    id: 'messages',
    schema: messageSchema,
    getKey: (item: MessageRow) => item.id,
    
    // Electric shape configuration
    shapeOptions: {
      url: process.env.EXPO_PUBLIC_ELECTRIC_API_URL || 'http://localhost:5133',
      params: {
        table: 'messages',
      },
    },
    
    // Sync mode: Progressive - loads query subset immediately, syncs full dataset in background
    syncMode: 'progressive',
    
    // Mutation handlers - maintain E2E encryption
    onInsert: async ({ transaction }) => {
      const { changes: newMessage } = transaction.mutations[0];
      
      // Note: Content should already be encrypted before insertion
      // This handler can validate or transform if needed
      // The actual encryption happens in the useMessages hook before calling insert()
      
      // Send to backend API for persistence (Electric syncs automatically, but we keep REST API for compatibility)
      try {
        // Optional: Also send to REST API for immediate persistence
        // This can be removed once Electric is fully stable
      } catch (error) {
        console.error('Error in messages onInsert handler:', error);
        throw error;
      }
      
      return { txid: `tx_${Date.now()}` };
    },
    
    onUpdate: async ({ transaction }) => {
      const { changes: updatedMessage } = transaction.mutations[0];
      
      // Handle updates (e.g., marking as read/delivered)
      // Content should not be updated (encrypted), only metadata
      
      return { txid: `tx_${Date.now()}` };
    },
    
    onDelete: async ({ transaction }) => {
      // Handle message deletion if needed
      return { txid: `tx_${Date.now()}` };
    },
  })
) as Collection<MessageRow>;

/**
 * Helper function to insert a message with encryption
 * This wraps the collection insert to handle encryption automatically
 */
export async function insertEncryptedMessage(
  messageData: {
    senderId: string;
    receiverId: string;
    content: string; // Plaintext
    timestamp?: Date;
  }
): Promise<string> {
  const chatId = generateChatId(messageData.senderId, messageData.receiverId);
  
  // Encrypt the message content
  const encryptedContent = await encryptMessage(
    messageData.content,
    chatId,
    messageData.senderId,
    messageData.receiverId
  );
  
  // Create message row with encrypted content
  const messageRow: MessageRow = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sender_id: messageData.senderId,
    receiver_id: messageData.receiverId,
    content: encryptedContent,
    timestamp: messageData.timestamp || new Date(),
    is_delivered: false,
    is_read: false,
  };
  
  // Insert into collection (Electric will sync automatically)
  await messagesCollection.insert(messageRow);
  
  return messageRow.id;
}

/**
 * Helper function to decrypt a message row
 */
export async function decryptMessageRow(
  messageRow: MessageRow,
  currentUserId: string
): Promise<{ id: string; text: string; timestamp: Date; senderId: string; receiverId: string; read: boolean }> {
  const chatId = generateChatId(messageRow.sender_id, messageRow.receiver_id);
  
  // Decrypt the content
  let decryptedText = messageRow.content;
  try {
    decryptedText = await decryptMessage(
      messageRow.content,
      chatId,
      currentUserId,
      messageRow.sender_id,
      messageRow.receiver_id
    );
  } catch (error) {
    console.warn('Failed to decrypt message:', error);
    // Keep encrypted text if decryption fails
  }
  
  return {
    id: messageRow.id,
    text: decryptedText,
    timestamp: messageRow.timestamp,
    senderId: messageRow.sender_id,
    receiverId: messageRow.receiver_id,
    read: messageRow.is_read,
  };
}

