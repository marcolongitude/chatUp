import { axiosInstance as api } from '@/shared/api/axiosClient';

/**
 * Tipos para a API de Mensagens
 */
export interface SendMessagePayload {
  receiverId: string;
  content: string; // Já criptografado
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

/**
 * API de Mensagens - Migrada de shared/api/chat.service.ts
 */
export const messageApi = {
  /**
   * Envia uma mensagem criptografada para o servidor
   */
  sendMessage: async (payload: SendMessagePayload): Promise<MessageResponse> => {
    const response = await api.post<MessageResponse>('/chat/messages', payload);
    return response.data;
  },
  
  /**
   * Busca histórico de mensagens com um contato
   */
  getMessages: async (contactId: string, limit = 20, offset = 0): Promise<MessageResponse[]> => {
    const response = await api.get<MessageResponse[]>(`/chat/messages/${contactId}`, {
      params: { limit, offset }
    });
    return response.data;
  },
};
