import "@/app/config/polyfills";

// Garantir que crypto.subtle está disponível antes de importar libsignal
// libsignal-protocol-typescript usa globalThis.crypto na inicialização
function ensureCryptoSubtle() {
  if (typeof globalThis === 'undefined') {
    console.error('❌ [preKeyService] globalThis não está disponível!');
    return false;
  }
  
  // Verificar se já está configurado
  if (globalThis.crypto && globalThis.crypto.subtle && globalThis.crypto.subtle.importKey) {
    console.log('✅ [preKeyService] crypto.subtle.importKey já está disponível');
    return true;
  }
  
  // Tentar configurar
  try {
    let QuickCrypto;
    try {
      // Tentar carregar o módulo - pode lançar erro se NitroModules não estiver disponível
      QuickCrypto = require('react-native-quick-crypto');
    } catch (requireError: any) {
      const errorMsg = requireError?.message || String(requireError);
      // Verificar se é erro de NitroModules
      if (errorMsg.includes('NitroModules') || errorMsg.includes('TurboModule') || errorMsg.includes('Turbo/Native-Module')) {
        console.error('❌ [preKeyService] NitroModules não está disponível!');
        console.error('❌ [preKeyService] O app precisa ser reconstruído após habilitar TurboModules.');
        console.error('❌ [preKeyService] Execute: cd android && ./gradlew clean && cd .. && npm run android');
      } else {
        console.error('❌ [preKeyService] Falha ao carregar react-native-quick-crypto:', errorMsg);
        console.error('❌ [preKeyService] O módulo nativo pode não estar compilado. Reconstrua o app Android.');
      }
      return false;
    }
    
    if (!QuickCrypto) {
      console.error('❌ [preKeyService] QuickCrypto é null após require!');
      return false;
    }
    
    if (!QuickCrypto.subtle) {
      console.error('❌ [preKeyService] QuickCrypto.subtle não está disponível!');
      console.error('❌ [preKeyService] Isso geralmente significa que TurboModules não está funcionando.');
      console.error('❌ [preKeyService] Verifique se newArchEnabled=true e reconstrua o app.');
      return false;
    }
    
    // Configurar globalThis.crypto completamente
    if (!globalThis.crypto) {
      globalThis.crypto = QuickCrypto;
    } else {
      // Preservar propriedades existentes e adicionar subtle
      globalThis.crypto.subtle = QuickCrypto.subtle;
      if (!globalThis.crypto.getRandomValues) {
        globalThis.crypto.getRandomValues = QuickCrypto.getRandomValues;
      }
    }
    
    // Verificação final
    if (globalThis.crypto.subtle && globalThis.crypto.subtle.importKey) {
      console.log('✅ [preKeyService] crypto.subtle.importKey configurado com sucesso');
      return true;
    } else {
      console.error('❌ [preKeyService] crypto.subtle.importKey ainda não está disponível após configuração!');
      return false;
    }
  } catch (e) {
    console.error('❌ [preKeyService] Falha ao configurar crypto.subtle:', e);
    return false;
  }
}

// Executar antes de importar libsignal
const cryptoReady = ensureCryptoSubtle();
if (!cryptoReady) {
  console.error('❌ [preKeyService] ATENÇÃO: crypto.subtle não está disponível! Signal Protocol pode falhar!');
}

import { KeyHelper, type KeyPairType, type PreKeyPairType } from "libsignal-protocol-typescript";
import { axiosInstance as api } from '@/shared/api';
import { arrayBufferToBase64, base64ToArrayBuffer } from "@/shared/lib/crypto/utils";
import { getSignalStorage, SignalStorage } from "./SignalStorage";

const MIN_PREKEY_POOL = 5;
const PREKEY_BATCH = 10; // Increase batch for API efficiency

export interface ApiPreKeyEntry {
	keyId: number;
	publicKey: string;
}

export interface RemotePreKeyBundle {
	identityKey: ArrayBuffer;
	registrationId: number;
	signedPreKey: {
		keyId: number;
		publicKey: ArrayBuffer;
		signature: ArrayBuffer;
	};
	preKey?: {
		keyId: number;
		publicKey: ArrayBuffer;
		// rawEntry no longer needed for backend consumption
	};
}

export async function bootstrapSignalAccount(userId: string): Promise<SignalStorage> {
    // No db check needed

	// Verificar novamente se crypto.subtle está disponível antes de usar KeyHelper
	if (!globalThis.crypto || !globalThis.crypto.subtle || !globalThis.crypto.subtle.importKey) {
		console.error('❌ [bootstrapSignalAccount] crypto.subtle.importKey não está disponível! Tentando configurar...');
		const cryptoReady = ensureCryptoSubtle();
		if (!cryptoReady) {
			throw new Error('crypto.subtle.importKey não está disponível. Signal Protocol não pode funcionar sem isso.');
		}
	}

	const storage = getSignalStorage(userId);

	let identity = await storage.getIdentityKeyPair();
	if (!identity) {
		// KeyHelper.generateIdentityKeyPair() precisa de crypto.subtle.importKey
		identity = await KeyHelper.generateIdentityKeyPair();
		await storage.setIdentityKeyPair(identity);
	}

	let registrationId = await storage.getLocalRegistrationId();
	if (!registrationId) {
		registrationId = KeyHelper.generateRegistrationId();
		await storage.setLocalRegistrationId(registrationId);
	}

	const signedPreKey = await ensureSignedPreKey(storage, identity);

    // Check prekey count from backend
    let additionalPreKeys: ApiPreKeyEntry[] = [];
    try {
        const countRes = await api.get('/keys/count/me');
        const count = countRes.data.count || 0;
        additionalPreKeys = await ensurePreKeyInventory(storage, count);
    } catch (e) {
        console.warn("Could not fetch prekey count, generating batch anyway", e);
        additionalPreKeys = await ensurePreKeyInventory(storage, 0); 
    }

	const payload = {
		identityKey: arrayBufferToBase64(identity.pubKey),
		registrationId,
		signedPreKey: {
			keyId: signedPreKey.keyId,
			publicKey: arrayBufferToBase64(signedPreKey.keyPair.pubKey),
			signature: arrayBufferToBase64(signedPreKey.signature),
		},
		preKeys: additionalPreKeys,
	};

	await api.post('/keys', payload);

	return storage;
}

export async function fetchRemotePreKeyBundle(userId: string): Promise<RemotePreKeyBundle | null> {
    console.log(`🔍 [preKeyService] Fetching remote bundle for: ${userId}`);
    try {
        const response = await api.get(`/keys/${userId}`);
        const data = response.data;
        console.log(`📦 [preKeyService] API Response for ${userId}:`, JSON.stringify(data, null, 2));

        if (!data) {
            console.warn(`⚠️ [preKeyService] Response data is empty for ${userId}`);
            return null;
        }

        if (!data.identityKey || !data.signedPreKey) {
            console.warn(`⚠️ [preKeyService] Missing critical keys in bundle for ${userId}:`, { 
                hasIdentity: !!data.identityKey, 
                hasSigned: !!data.signedPreKey 
            });
            return null;
        }

        return {
            identityKey: base64ToArrayBuffer(data.identityKey),
            registrationId: data.registrationId,
            signedPreKey: {
                keyId: data.signedPreKey.keyId,
                publicKey: base64ToArrayBuffer(data.signedPreKey.publicKey),
                signature: base64ToArrayBuffer(data.signedPreKey.signature),
            },
            preKey: data.preKey
                ? {
                        keyId: data.preKey.keyId,
                        publicKey: base64ToArrayBuffer(data.preKey.publicKey),
                  }
                : undefined,
        };
    } catch (e: any) {
        console.error(`❌ [preKeyService] Error fetching remote bundle for ${userId}:`, e.message, e.response?.status);
        return null;
    }
}

export async function consumeRemotePreKey(remoteUserId: string, entry?: any): Promise<void> {
	// Backend handles consumption on fetch
    return;
}

async function ensureSignedPreKey(
	storage: SignalStorage,
	identity: KeyPairType
): Promise<{ keyId: number; keyPair: KeyPairType; signature: ArrayBuffer }> {
	const activeId = (await storage.getActiveSignedPreKeyId()) ?? (await storage.getLastSignedPreKeyId());
	const existingPair = await storage.loadSignedPreKey(activeId);
	const existingSignature = await storage.loadSignedPreKeySignature(activeId);

	if (existingPair && existingSignature) {
		return { keyId: activeId, keyPair: existingPair, signature: existingSignature };
	}

	const nextId = await storage.getLastSignedPreKeyId();
	const generated = await KeyHelper.generateSignedPreKey(identity, nextId);
	await storage.storeSignedPreKey(nextId, generated.keyPair);
	await storage.storeSignedPreKeySignature(nextId, generated.signature);
	await storage.setLastSignedPreKeyId(nextId + 1);
	await storage.setActiveSignedPreKeyId(nextId);

	return { keyId: nextId, keyPair: generated.keyPair, signature: generated.signature };
}

async function ensurePreKeyInventory(storage: SignalStorage, currentRemoteCount: number): Promise<ApiPreKeyEntry[]> {
    // Logic remains mostly same but types changed
	const deficit = Math.max(MIN_PREKEY_POOL - currentRemoteCount, 0);
	const needed = deficit > 0 ? Math.max(deficit, PREKEY_BATCH) : 0;
	if (needed === 0) {
		return [];
	}
	return generatePreKeys(storage, needed);
}

async function generatePreKeys(storage: SignalStorage, amount: number): Promise<ApiPreKeyEntry[]> {
	const entries: ApiPreKeyEntry[] = [];
	let nextId = await storage.getLastPreKeyId();

	for (let i = 0; i < amount; i += 1) {
		const preKey = await KeyHelper.generatePreKey(nextId);
		await persistPreKey(storage, preKey);
		entries.push({
			keyId: preKey.keyId,
			publicKey: arrayBufferToBase64(preKey.keyPair.pubKey),
		});
		nextId = Math.max(nextId, preKey.keyId + 1);
	}

	await storage.setLastPreKeyId(nextId);

	return entries;
}

async function persistPreKey(storage: SignalStorage, preKey: PreKeyPairType): Promise<void> {
	await storage.storePreKey(preKey.keyId, preKey.keyPair);
}

