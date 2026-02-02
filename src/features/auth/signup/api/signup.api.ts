import { axiosInstance } from '@/shared/api/axiosClient';
import type { RegisterData, AuthResponse } from '../../model/types';

/**
 * Registra um novo usuário via API
 */
export async function signupApi(data: RegisterData): Promise<AuthResponse> {
	const response = await axiosInstance.post<AuthResponse>('/auth/register', {
		email: data.email,
		password: data.password,
		displayName: data.name,
	});
	return {
		user: {
			id: (response.data as any).id,
			email: (response.data as any).email,
			name: (response.data as any).displayName,
		},
		token: '',
	};
}
