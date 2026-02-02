import { getOrCreateKeyPair } from '@/shared/lib/crypto';
import { bootstrapSignalAccount } from '@/shared/lib/crypto/signal';

/**
 * Inicializa as chaves criptográficas do usuário após login
 */
export async function initializeCrypto(userId: string): Promise<void> {
	try {
		await getOrCreateKeyPair(userId);
		await bootstrapSignalAccount(userId);
	} catch (e) {
		console.warn('[Auth/Login] Crypto initialization failed', e);
	}
}
