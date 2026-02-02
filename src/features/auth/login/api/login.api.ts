import { axiosInstance } from '@/shared/api/axiosClient';
import type { LoginCredentials, AuthResponse } from '../../model/types';

/**
 * Realiza login do usuário via API
 */
export async function loginApi(credentials: LoginCredentials): Promise<AuthResponse> {
	const response = await axiosInstance.post<AuthResponse>('/auth/login', {
		email: credentials.email,
		password: credentials.password,
	});
	return {
		user: response.data.user,
		token: (response.data as any).accessToken,
	};
}
