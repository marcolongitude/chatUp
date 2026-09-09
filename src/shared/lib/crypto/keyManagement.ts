/**
 * Gerenciamento de chaves X25519 para E2EE (apenas @stablelib + expo-crypto).
 * Chave privada: Keychain/SecureStore. Chave pública: API /keys ou /users.
 */

import * as Keychain from "react-native-keychain";
import { generateKeyPairFromSeed, scalarMultBase } from "@stablelib/x25519";
import { axiosInstance as api } from "@/shared/api";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const X25519_PUBLIC_KEY_LENGTH = 32;

/**
 * Converte Uint8Array para base64 (compatível com React Native)
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
	const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
	return btoa(binary);
}

/**
 * Converte base64 para Uint8Array (compatível com React Native)
 */
function base64ToUint8Array(base64: string): Uint8Array {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

/**
 * Normaliza chave pública X25519 para 32 bytes (alguns backends retornam 33 com prefixo).
 */
function normalizePublicKeyX25519(bytes: Uint8Array): Uint8Array | null {
	if (bytes.length === X25519_PUBLIC_KEY_LENGTH) return bytes;
	if (bytes.length === 33) return bytes.slice(-32);
	return null;
}

// Verificar se Keychain está disponível
let isKeychainAvailable = true;
try {
	// Testar se Keychain está disponível
	if (!Keychain || typeof Keychain.setGenericPassword !== "function") {
		isKeychainAvailable = false;
	}
} catch (error) {
	isKeychainAvailable = false;
	console.warn("⚠️ Keychain não disponível, usando SecureStore como fallback");
}

const KEYCHAIN_SERVICE = "com.chatup.e2ee";
const KEYCHAIN_KEY_PRIVATE = "private_key";

// Cache de chaves públicas (evitar buscar do Firestore toda vez)
const publicKeyCache = new Map<string, { key: Uint8Array; timestamp: number }>();
const PUBLIC_KEY_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

/**
 * Gera par de chaves X25519 usando @stablelib/x25519 + expo-crypto (sem polyfills).
 */
export async function generateKeyPair(): Promise<{ privateKey: Uint8Array; publicKey: Uint8Array }> {
	try {
		const seed = await Crypto.getRandomBytesAsync(32);
		const { publicKey, secretKey } = generateKeyPairFromSeed(seed);
		console.log("✅ Par de chaves X25519 gerado (StableLib)");
		return { privateKey: secretKey, publicKey };
	} catch (error) {
		console.error("❌ Erro ao gerar par de chaves:", error);
		throw new Error("Falha ao gerar par de chaves");
	}
}

/**
 * Armazena chave privada no Keychain do sistema (ou SecureStore como fallback)
 */
export async function storePrivateKey(userId: string, privateKey: Uint8Array): Promise<void> {
	try {
		// Converter chave privada para base64 para armazenar
		const privateKeyBase64 = uint8ArrayToBase64(privateKey);
		const storageKey = `${KEYCHAIN_SERVICE}_${KEYCHAIN_KEY_PRIVATE}_${userId}`;

		if (isKeychainAvailable) {
			try {
				// Tentar usar Keychain primeiro
				await Keychain.setGenericPassword(userId, privateKeyBase64, {
					service: `${KEYCHAIN_SERVICE}_${KEYCHAIN_KEY_PRIVATE}`,
					accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
				});
				console.log("✅ Chave privada armazenada no Keychain");
				return;
			} catch (keychainError) {
				console.warn("⚠️ Erro ao usar Keychain, tentando SecureStore:", keychainError);
				isKeychainAvailable = false;
			}
		}

		// Fallback: usar SecureStore
		await SecureStore.setItemAsync(storageKey, privateKeyBase64);
		console.log("✅ Chave privada armazenada no SecureStore (fallback)");
	} catch (error) {
		console.error("❌ Erro ao armazenar chave privada:", error);
		throw new Error("Falha ao armazenar chave privada");
	}
}

/**
 * Recupera chave privada do Keychain (ou SecureStore como fallback)
 */
export async function getPrivateKey(userId: string): Promise<Uint8Array | null> {
	try {
		const storageKey = `${KEYCHAIN_SERVICE}_${KEYCHAIN_KEY_PRIVATE}_${userId}`;

		if (isKeychainAvailable) {
			try {
				// Tentar usar Keychain primeiro
				const credentials = await Keychain.getGenericPassword({
					service: `${KEYCHAIN_SERVICE}_${KEYCHAIN_KEY_PRIVATE}`,
				});

				if (credentials && credentials.password && credentials.username === userId) {
					// Converter de base64 para Uint8Array
					const privateKey = base64ToUint8Array(credentials.password);
					console.log("✅ Chave privada recuperada do Keychain", {
						userId,
						keyLength: privateKey.length,
					});
					return privateKey;
				} else {
					console.warn("⚠️ Keychain retornou credenciais inválidas ou username não corresponde", {
						userId,
						hasCredentials: !!credentials,
						hasPassword: credentials ? !!credentials.password : false,
						username: credentials ? credentials.username : undefined,
					});
				}
			} catch (keychainError: any) {
				console.warn("⚠️ Erro ao usar Keychain, tentando SecureStore:", {
					error: keychainError?.message || String(keychainError),
					userId,
					storageKey,
				});
				isKeychainAvailable = false;
			}
		}

		// Fallback: usar SecureStore
		try {
			const storedKey = await SecureStore.getItemAsync(storageKey);
			if (!storedKey) {
				console.warn("⚠️ Chave privada não encontrada no SecureStore", { userId, storageKey });
				return null;
			}

			// Converter de base64 para Uint8Array
			const privateKey = base64ToUint8Array(storedKey);
			console.log("✅ Chave privada recuperada do SecureStore", {
				userId,
				keyLength: privateKey.length,
			});
			return privateKey;
		} catch (secureStoreError: any) {
			console.error("❌ Erro ao recuperar chave privada do SecureStore:", {
				error: secureStoreError?.message || String(secureStoreError),
				userId,
				storageKey,
			});
			return null;
		}
	} catch (error: any) {
		console.error("❌ Erro ao recuperar chave privada:", {
			error: error?.message || String(error),
			userId,
			stack: error?.stack,
		});
		return null;
	}
}

/**
 * Armazena chave pública no Firestore
 */
export async function storePublicKey(userId: string, publicKey: Uint8Array): Promise<void> {
	try {
		// Converter chave pública para base64
		const publicKeyBase64 = uint8ArrayToBase64(publicKey);

        // NÃO postar em /keys aqui: UploadKeys exige identityKey completo.
        // Um POST só com publicKey pode zerar identity_key no upsert e quebrar o E2EE Stablelib.
        try {
            console.log("🔄 Atualizando public_key no perfil do usuário...");
            await api.put(`/users/${userId}`, {
                public_key: publicKeyBase64,
                publicKey: publicKeyBase64,
            });
            console.log("✅ Chave pública vinculada ao perfil do usuário (/users/:id)");
        } catch (profileError: any) {
            console.error("❌ Falha crítica ao vincular chave pública ao perfil:", profileError.message);
        }

		// Atualizar cache
		publicKeyCache.set(userId, {
			key: publicKey,
			timestamp: Date.now(),
		});
	} catch (error) {
		console.error("❌ Erro ao armazenar chave pública:", error);
		throw new Error("Falha ao armazenar chave pública");
	}
}

/**
 * Busca chave pública: primeiro em /keys (bundle Signal), depois em /users (public_key no perfil).
 * Assim contatos que só têm chave no perfil (E2EE legacy, sem pre-keys) também podem receber mensagens.
 */
export async function getPublicKey(userId: string): Promise<Uint8Array | null> {
	try {
		// Verificar cache primeiro
		const cached = publicKeyCache.get(userId);
		if (cached && Date.now() - cached.timestamp < PUBLIC_KEY_CACHE_TTL_MS) {
			console.log("🔑 Chave pública recuperada do cache", { userId });
			return cached.key;
		}

		const decodeAndNormalize = (raw: string): Uint8Array | null => {
			const bytes = base64ToUint8Array(raw);
			return normalizePublicKeyX25519(bytes);
		};

		// 1. GET /keys/:userId
		try {
			const response = await api.get<{ success?: boolean; publicKey?: string }>(`/keys/${userId}`);
			const data = response.data;
			if (data?.publicKey) {
				const publicKey = decodeAndNormalize(data.publicKey);
				if (publicKey) {
					publicKeyCache.set(userId, { key: publicKey, timestamp: Date.now() });
					console.log("✅ Chave pública da API (/keys)", { userId });
					return publicKey;
				}
			}
		} catch {
			// Pode não existir bundle para este usuário
		}

		// 2. Fallback: GET /users/:userId (public_key no perfil)
		try {
			const response = await api.get<{ publicKey?: string; public_key?: string }>(`/users/${userId}`);
			const raw = response.data?.publicKey ?? response.data?.public_key;
			if (raw) {
				const publicKey = decodeAndNormalize(raw);
				if (publicKey) {
					publicKeyCache.set(userId, { key: publicKey, timestamp: Date.now() });
					console.log("✅ Chave pública do perfil (/users)", { userId });
					return publicKey;
				}
			}
		} catch {
			// Ignorar
		}

		return null;
	} catch (error) {
		console.error("❌ Erro ao buscar chave pública:", error);
		return null;
	}
}

/**
 * Obtém ou cria par de chaves do usuário
 * Se não existir, gera novo par e armazena
 */
export async function getOrCreateKeyPair(userId: string): Promise<{ privateKey: Uint8Array; publicKey: Uint8Array }> {
	try {
		// Tentar recuperar chave privada do Keychain/SecureStore
		let privateKey = await getPrivateKey(userId);

		if (privateKey && privateKey.length === X25519_PUBLIC_KEY_LENGTH) {
			// Derivar chave pública com @stablelib (X25519)
			let resolvedPublicKey = scalarMultBase(privateKey);

			const storedPublicKey = await getPublicKey(userId);
			if (!storedPublicKey) {
				await storePublicKey(userId, resolvedPublicKey);
			} else {
				resolvedPublicKey = storedPublicKey;
			}

			return { privateKey, publicKey: resolvedPublicKey };
		}

		// Chave privada não existe, gerar novo par
		console.log("🔄 Gerando novo par de chaves para usuário", { userId });
		const keyPair = await generateKeyPair();

		// Armazenar chave privada no Keychain/SecureStore
		await storePrivateKey(userId, keyPair.privateKey);

		// Armazenar chave pública no Firestore
		await storePublicKey(userId, keyPair.publicKey);

		return keyPair;
	} catch (error) {
		console.error("❌ Erro ao obter/criar par de chaves:", error);
		throw error;
	}
}

/**
 * Verifica se usuário tem chave pública no Firestore
 */
export async function hasPublicKey(userId: string): Promise<boolean> {
	const publicKey = await getPublicKey(userId);
	return publicKey !== null;
}

/**
 * Limpa cache de chaves públicas (útil para logout)
 */
export function clearPublicKeyCache(): void {
	publicKeyCache.clear();
	console.log("✅ Cache de chaves públicas limpo");
}

/**
 * Remove chave privada do Keychain/SecureStore (útil para logout)
 */
export async function removePrivateKey(userId: string): Promise<void> {
	try {
		const storageKey = `${KEYCHAIN_SERVICE}_${KEYCHAIN_KEY_PRIVATE}_${userId}`;

		if (isKeychainAvailable) {
			try {
				await Keychain.resetGenericPassword({
					service: `${KEYCHAIN_SERVICE}_${KEYCHAIN_KEY_PRIVATE}`,
				});
				console.log("✅ Chave privada removida do Keychain");
			} catch (keychainError) {
				console.warn("⚠️ Erro ao remover do Keychain, tentando SecureStore:", keychainError);
				await SecureStore.deleteItemAsync(storageKey);
				console.log("✅ Chave privada removida do SecureStore");
			}
		} else {
			await SecureStore.deleteItemAsync(storageKey);
			console.log("✅ Chave privada removida do SecureStore");
		}
	} catch (error) {
		console.error("❌ Erro ao remover chave privada:", error);
	}
}
