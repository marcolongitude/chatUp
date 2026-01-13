/**
 * Chat API Service
 * REST API fallback when Electric SQL is not available
 */

import api from './index';
import type { Message } from '@/modules/chat/types';

export interface ApiMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  isDelivered: boolean;
  isRead: boolean;
}

/**
 * Fetch messages from backend API
 */
export async function fetchMessages(contactId: string, limit = 20, offset = 0): Promise<ApiMessage[]> {
  try {
    const response = await api.get<ApiMessage[]>(`/chat/messages/${contactId}`, {
      params: { limit, offset },
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching messages from API:', error);
    throw error;
  }
}

/**
 * Send message via backend API
 * Note: Backend may not have POST endpoint yet - this will fail gracefully
 */
export async function sendMessageApi(receiverId: string, content: string): Promise<ApiMessage> {
  try {
    // Try POST endpoint first
    try {
      const response = await api.post<ApiMessage>('/chat/messages', {
        receiverId,
        content,
      });
      return response.data;
    } catch (postError: any) {
      // If POST doesn't exist (404), log warning but don't fail
      if (postError?.response?.status === 404) {
        console.warn('⚠️ POST /chat/messages not available - backend may need endpoint');
        // Return a mock response for now
        return {
          id: `msg_${Date.now()}`,
          senderId: '', // Will be set by caller
          receiverId,
          content,
          timestamp: new Date().toISOString(),
          isDelivered: false,
          isRead: false,
        };
      }
      throw postError;
    }
  } catch (error) {
    console.error('❌ Error sending message via API:', error);
    throw error;
  }
}
