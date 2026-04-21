/**
 * Cache de plaintext para mensagens próprias
 * Evita tentativa de descriptografar mensagens que o usuário enviou
 */

const ownMessagePlaintextCache = new Map<string, { plaintext: string; timestamp: number }>();
const PLAINTEXT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Armazena o plaintext de uma mensagem própria ANTES de criptografar
 * Usado para exibir a mensagem corretamente quando ela volta via sync
 * NOTA: Usamos o ciphertext como chave pois o messageId gerado no cliente
 * muda quando o servidor persiste a mensagem.
 */
export function cacheOwnMessage(ciphertext: string, plaintext: string): void {
	ownMessagePlaintextCache.set(ciphertext, {
		plaintext,
		timestamp: Date.now()
	});
	
	// Limpar cache antigo
	for (const [key, data] of ownMessagePlaintextCache.entries()) {
		if (Date.now() - data.timestamp > PLAINTEXT_CACHE_TTL_MS) {
			ownMessagePlaintextCache.delete(key);
		}
	}
	
	console.log("💾 Plaintext armazenado no cache pelo CIPHERTEXT (survive ID sync)");
}

/**
 * Recupera o plaintext de uma mensagem própria do cache usando o ciphertext
 */
export function getOwnMessage(ciphertext: string): string | null {
	const cached = ownMessagePlaintextCache.get(ciphertext);
	if (!cached) return null;
	
	// Verificar se expirou
	if (Date.now() - cached.timestamp > PLAINTEXT_CACHE_TTL_MS) {
		ownMessagePlaintextCache.delete(ciphertext);
		return null;
	}
	
	return cached.plaintext;
}

/**
 * Limpa todo o cache (útil para logout)
 */
export function clearOwnMessageCache(): void {
	ownMessagePlaintextCache.clear();
	console.log("🧹 Cache de mensagens próprias limpo");
}
