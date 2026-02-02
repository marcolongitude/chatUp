import { axiosInstance as api } from '@/shared/api/axiosClient';
import type { UserProfile } from '@/features/auth';

/**
 * API de Usuário - Migrada de shared/api/user.service.ts
 */
export const userApi = {
  /**
   * Busca dados de um usuário pelo ID
   */
  getUserById: async (userId: string): Promise<UserProfile> => {
    const response = await api.get<UserProfile>(`/users/${userId}`);
    return response.data;
  },
};
