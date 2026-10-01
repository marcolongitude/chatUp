import { axiosInstance as api } from './axiosClient';

export interface SendMessagePayload {
  receiverId: string;
  content: string; // Already encrypted
}

export interface MessageResponse {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  isDelivered: boolean;
  isRead: boolean;
}

export const chatService = {
  sendMessage: async (payload: SendMessagePayload): Promise<MessageResponse> => {
    const response = await api.post<MessageResponse>('/chat/messages', payload);
    return response.data;
  },
  
  getMessages: async (contactId: string, limit = 20, offset = 0): Promise<MessageResponse[]> => {
    const response = await api.get<MessageResponse[]>(`/chat/messages/${contactId}`, {
      params: { limit, offset }
    });
    return response.data;
  },
};
