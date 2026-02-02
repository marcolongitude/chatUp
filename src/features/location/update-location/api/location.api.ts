import { axiosInstance } from '@/shared/api/axiosClient';

/**
 * API para atualização de localização
 */
export async function updateLocationApi(latitude: number, longitude: number): Promise<void> {
    await axiosInstance.put('/location', {
        latitude,
        longitude
    });
}
