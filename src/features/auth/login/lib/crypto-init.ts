import { getOrCreateKeyPair, bootstrapStableAccount } from '@/shared/lib/crypto';

/**
 * Inicializa as chaves criptográficas do usuário após login
 */
export async function initializeCrypto(userId: string): Promise<void> {
	try {
		await getOrCreateKeyPair(userId);
		await bootstrapStableAccount(userId);
	} catch (e) {
		console.warn('[Auth/Login] Crypto initialization failed', e);
	}
}
