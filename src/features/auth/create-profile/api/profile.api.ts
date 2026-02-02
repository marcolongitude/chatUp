import { axiosInstance } from '@/shared/api/axiosClient';
import type { CreateProfileData } from '../../model/types';

/**
 * Atualiza o perfil do usuário via API
 */
export async function updateProfileApi(userId: string, data: Partial<CreateProfileData>): Promise<any> {
	const response = await axiosInstance.put(`/users/${userId}`, data);
	return response.data;
}
