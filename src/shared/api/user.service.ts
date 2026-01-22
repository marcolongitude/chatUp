import { axiosInstance as api } from './axiosClient';
import type { UserProfile } from '@/features/auth';

export const userService = {
  getUserById: async (userId: string): Promise<UserProfile> => {
    const response = await api.get<UserProfile>(`/users/${userId}`);
    return response.data;
  },
};
