import { axiosInstance } from '@/shared/api/axiosClient';
import type { NearbyUser } from '@/entities/contact';

/**
 * Parâmetros para busca de usuários próximos
 */
export interface FetchNearbyParams {
    latitude: number;
    longitude: number;
    radius: number;
}

/**
 * API para buscar usuários próximos
 */
export async function fetchNearbyUsersApi(params: FetchNearbyParams): Promise<NearbyUser[]> {
    const response = await axiosInstance.get<NearbyUser[]>('/location/nearby', {
        params
    });
    return response.data;
}
