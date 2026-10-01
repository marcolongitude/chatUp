import { generateKeyPairFromSeed, sharedKey } from "@stablelib/x25519";
import { XChaCha20Poly1305 } from "@stablelib/xchacha20poly1305";
import { HKDF } from "@stablelib/hkdf";
import { SHA256 } from "@stablelib/sha256";
import * as Crypto from "expo-crypto";

/**
 * Wrapper para primitivas Stablelib otimizadas para React Native.
 * Evita dependências de Node/Browser que quebram no ambiente RN.
 */
export class StableLibCrypto {
    /**
     * Gera um par de chaves X25519 (ECDH)
     */
    static async generateKeyPair() {
        // Usar expo-crypto para entropia segura no RN
        const seed = await Crypto.getRandomBytesAsync(32);
        return generateKeyPairFromSeed(seed);
    }

    /**
     * Deriva uma chave compartilhada (Shared Secret) via ECDH
     */
    static deriveSharedSecret(privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array {
        return sharedKey(privateKey, publicKey);
    }

    /**
     * Deriva chaves fortes usando HKDF-SHA256
     */
    static deriveKeys(sharedSecret: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number = 32): Uint8Array {
        const hkdf = new HKDF(SHA256, sharedSecret, salt, info);
        return hkdf.expand(length);
    }

    /**
     * Criptografa dados usando XChaCha20-Poly1305
     */
    static async encrypt(key: Uint8Array, plaintext: Uint8Array): Promise<{ ciphertext: Uint8Array; nonce: Uint8Array }> {
        const cipher = new XChaCha20Poly1305(key);
        const nonce = await Crypto.getRandomBytesAsync(cipher.nonceLength);
        const ciphertext = cipher.seal(nonce, plaintext);
        return { ciphertext, nonce };
    }

    /**
     * Descriptografa dados usando XChaCha20-Poly1305
     */
    static decrypt(key: Uint8Array, nonce: Uint8Array, ciphertext: Uint8Array): Uint8Array | null {
        try {
            const cipher = new XChaCha20Poly1305(key);
            return cipher.open(nonce, ciphertext);
        } catch (e) {
            console.error("❌ StableLibCrypto: Decryption failed", e);
            return null;
        }
    }
}
