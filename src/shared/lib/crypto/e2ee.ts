/**
 * E2EE usando apenas @stablelib: X25519 + HKDF-SHA256 + XChaCha20-Poly1305.
 * Sem CryptoJS, sem @noble. Chaves sempre 32 bytes.
 */

import { sharedKey } from "@stablelib/x25519";
import { HKDF } from "@stablelib/hkdf";
import { SHA256 } from "@stablelib/sha256";
import { XChaCha20Poly1305 } from "@stablelib/xchacha20poly1305";
import * as Crypto from "expo-crypto";
import { getPrivateKey, getPublicKey } from "./keyManagement";

const sharedSecretCache = new Map<string, { secret: Uint8Array; timestamp: number }>();
const SHARED_SECRET_CACHE_TTL_MS = 60 * 60 * 1000;

const HKDF_SALT = new TextEncoder().encode("chatup-e2ee-v1");
const HKDF_INFO = new TextEncoder().encode("xchacha20poly1305");

function bytesToBase64(bytes: Uint8Array): string {
	let s = "";
	for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
	return btoa(s);
}

function base64ToBytes(base64: string): Uint8Array {
	const s = atob(base64);
	const bytes = new Uint8Array(s.length);
	for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
	return bytes;
}

/**
 * Deriva chave compartilhada ECDH (X25519) e normaliza para 32 bytes.
 */
export function deriveSharedSecret(privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array {
	if (privateKey.length !== 32 || publicKey.length !== 32) {
		throw new Error("X25519 keys must be 32 bytes");
	}
	return sharedKey(privateKey, publicKey);
}

/**
 * Deriva chave de cifra (32 bytes) a partir do shared secret via HKDF-SHA256.
 */
function deriveEncryptionKey(sharedSecret: Uint8Array): Uint8Array {
	const hkdf = new HKDF(SHA256, sharedSecret, HKDF_SALT, HKDF_INFO);
	return hkdf.expand(32);
}

export async function getSharedSecret(
	chatId: string,
	userIdA: string,
	userIdB: string
): Promise<Uint8Array> {
	const cacheKey = [userIdA, userIdB].sort().join("_");
	const cached = sharedSecretCache.get(cacheKey);
	if (cached && Date.now() - cached.timestamp < SHARED_SECRET_CACHE_TTL_MS) {
		return cached.secret;
	}

	const privateKeyA = await getPrivateKey(userIdA);
	if (!privateKeyA) {
		throw new Error(`Chave privada não encontrada para ${userIdA}`);
	}

	const publicKeyB = await getPublicKey(userIdB);
	if (!publicKeyB) {
		throw new Error(`Chave pública não encontrada para ${userIdB}. O contato pode não ter gerado chaves ainda.`);
	}

	const rawSecret = deriveSharedSecret(privateKeyA, publicKeyB);
	const encryptionKey = deriveEncryptionKey(rawSecret);

	sharedSecretCache.set(cacheKey, {
		secret: encryptionKey,
		timestamp: Date.now(),
	});
	return encryptionKey;
}

/**
 * Criptografa com XChaCha20-Poly1305 (AEAD). Payload: ENC:base64(JSON({ v:"5", n, c })).
 */
export async function encryptMessageE2EE(
	plaintext: string,
	chatId: string,
	senderId: string,
	receiverId: string
): Promise<string> {
	const key = await getSharedSecret(chatId, senderId, receiverId);
	const cipher = new XChaCha20Poly1305(key);
	const nonce = await Crypto.getRandomBytesAsync(cipher.nonceLength);
	const plainBytes = new TextEncoder().encode(plaintext);
	const ciphertext = cipher.seal(nonce, plainBytes);

	const payload = {
		v: "5",
		n: bytesToBase64(nonce),
		c: bytesToBase64(ciphertext),
	};
	const json = JSON.stringify(payload);
	const encoded = btoa(unescape(encodeURIComponent(json)));
	return "ENC:" + encoded;
}

/**
 * Descriptografa payload v5 (XChaCha20-Poly1305).
 */
export async function decryptMessageE2EE(
	encryptedText: string,
	chatId: string,
	senderId: string,
	receiverId: string
): Promise<string> {
	if (!encryptedText.startsWith("ENC:")) {
		throw new Error("Mensagem não criptografada");
	}

	const json = decodeURIComponent(escape(atob(encryptedText.slice(4))));
	const payload = JSON.parse(json);
	if (payload.v !== "5") {
		throw new Error(`Versão não suportada: ${payload.v}`);
	}

	const key = await getSharedSecret(chatId, receiverId, senderId);
	const cipher = new XChaCha20Poly1305(key);
	const nonce = base64ToBytes(payload.n);
	const ciphertext = base64ToBytes(payload.c);
	const plainBytes = cipher.open(nonce, ciphertext);
	if (!plainBytes) {
		throw new Error("Falha ao descriptografar (tag inválida)");
	}
	return new TextDecoder().decode(plainBytes);
}

export function clearSharedSecretCache(): void {
	sharedSecretCache.clear();
}
