import { bootstrapStableAccount } from "@/shared/lib/crypto";

/**
 * Inicializa apenas a identidade Stablelib (padrão atual).
 * Não chama getOrCreateKeyPair: ele gerava outro par legacy e podia
 * sobrescrever /keys com payload incompleto (identityKey vazio).
 */
export async function initializeCrypto(userId: string): Promise<void> {
	try {
		await bootstrapStableAccount(userId);
	} catch (error) {
		console.warn("[Auth] Crypto initialization failed", error);
	}
}
