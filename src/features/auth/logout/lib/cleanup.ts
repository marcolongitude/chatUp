import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_STORAGE_KEYS = ['auth.token', 'auth.user'];

/**
 * Limpa todos os dados de autenticação armazenados localmente
 */
export async function cleanupAuthData(): Promise<void> {
	await AsyncStorage.multiRemove(AUTH_STORAGE_KEYS);
}
