import { StableLibCrypto } from "./stableLibCrypto";
import { getStableStorage } from "./StableLibStorage";
import { axiosInstance as api } from "@/shared/api";
import { Buffer } from "buffer";

/** Cache em memória da identity pública do peer — evita GET /keys por mensagem. */
const PEER_KEY_CACHE_TTL_MS = 30 * 60 * 1000;
/** No máximo um force-refresh de sessão por peer neste intervalo. */
const FORCE_REFRESH_COOLDOWN_MS = 60 * 1000;
/** Ciphertexts que falharam após refresh — não disparam nova tempestade. */
const POISON_CIPHERTEXT_TTL_MS = 60 * 60 * 1000;

type PeerKeyCacheEntry = { identityKey: string; fetchedAt: number };
type CooldownEntry = { at: number };

const peerKeyCache = new Map<string, PeerKeyCacheEntry>();
const peerKeyInflight = new Map<string, Promise<string>>();
const forceRefreshCooldown = new Map<string, CooldownEntry>();
const poisonCiphertexts = new Map<string, number>();
const publishedIdentityKeys = new Map<string, string>();

function cacheKey(userId: string, contactId: string): string {
	return `${userId}:${contactId}`;
}

function poisonKey(userId: string, contactId: string, ciphertext: string): string {
	return `${userId}:${contactId}:${ciphertext}`;
}

function prunePoison(): void {
	const now = Date.now();
	for (const [key, at] of poisonCiphertexts.entries()) {
		if (now - at > POISON_CIPHERTEXT_TTL_MS) poisonCiphertexts.delete(key);
	}
	if (poisonCiphertexts.size > 500) {
		const oldest = Array.from(poisonCiphertexts.entries())
			.sort((a, b) => a[1] - b[1])
			.slice(0, poisonCiphertexts.size - 500);
		for (const [key] of oldest) poisonCiphertexts.delete(key);
	}
}

/**
 * Gerenciador de Sessões Stablelib
 * Substitui o SessionManager do Signal por uma implementação leve e estável.
 */
export class StableLibSessionManager {
	static async bootstrap(userId: string) {
		console.log("🔐 [StableCrypto] Bootstrapping account for:", userId);
		const storage = getStableStorage(userId);
		let identity = await storage.getIdentity();
		let createdNewIdentity = false;

		if (!identity) {
			console.log("🆕 [StableCrypto] Generating new X25519 identity");
			const newPair = await StableLibCrypto.generateKeyPair();
			await storage.saveIdentity(newPair.publicKey, newPair.secretKey);
			identity = { publicKey: newPair.publicKey, privateKey: newPair.secretKey };
			createdNewIdentity = true;
			// Old peer sessions cannot decrypt with a new identity.
			await storage.clearSessions();
		}

		const pubBase64 = Buffer.from(identity.publicKey).toString("base64");
		if (!createdNewIdentity && publishedIdentityKeys.get(userId) === pubBase64) {
			return;
		}

		try {
			await api.post("/keys", {
				identityKey: pubBase64,
				registrationId: 0,
				signedPreKey: {
					keyId: 0,
					publicKey: pubBase64,
					signature: pubBase64,
				},
				publicKey: pubBase64,
			});
			// Keep users.public_key aligned with Stable identity (legacy readers).
			await api.put(`/users/${userId}`, {
				publicKey: pubBase64,
				public_key: pubBase64,
			});
			publishedIdentityKeys.set(userId, pubBase64);
			console.log("✅ [StableCrypto] Registered keys on backend", {
				createdNewIdentity,
			});
		} catch (e) {
			console.warn("⚠️ [StableCrypto] Backend registration failed", e);
		}
	}

	private static async fetchPeerIdentityKey(contactId: string): Promise<string> {
		const cached = peerKeyCache.get(contactId);
		if (cached && Date.now() - cached.fetchedAt < PEER_KEY_CACHE_TTL_MS) {
			return cached.identityKey;
		}

		const inflight = peerKeyInflight.get(contactId);
		if (inflight) return inflight;

		const request = (async () => {
			const response = await api.get(`/keys/${contactId}`);
			const data = response.data;
			if (!data || !data.identityKey) {
				throw new Error(`Contact ${contactId} has no public keys registered.`);
			}
			const identityKey = String(data.identityKey);
			peerKeyCache.set(contactId, { identityKey, fetchedAt: Date.now() });
			return identityKey;
		})().finally(() => {
			peerKeyInflight.delete(contactId);
		});

		peerKeyInflight.set(contactId, request);
		return request;
	}

	static async ensureSession(
		currentUserId: string,
		contactId: string,
		options?: { forceRefresh?: boolean }
	): Promise<Uint8Array> {
		const storage = getStableStorage(currentUserId);
		const forceRefresh = Boolean(options?.forceRefresh);

		if (!forceRefresh) {
			const existing = await storage.getSession(contactId);
			if (existing?.secret && existing.peerIdentityKey) {
				return existing.secret;
			}
		}

		if (forceRefresh) {
			peerKeyCache.delete(contactId);
		}

		const peerIdentityKey = await this.fetchPeerIdentityKey(contactId);
		const existing = forceRefresh ? null : await storage.getSession(contactId);
		if (existing?.secret && existing.peerIdentityKey === peerIdentityKey) {
			return existing.secret;
		}

		console.log("🔄 [StableCrypto] Establishing session with", contactId, {
			forceRefresh,
			peerKeyChanged: Boolean(existing && existing.peerIdentityKey !== peerIdentityKey),
		});

		const myIdentity = await storage.getIdentity();
		if (!myIdentity) throw new Error("Local identity not found. Call bootstrap first.");

		const contactPub = new Uint8Array(Buffer.from(peerIdentityKey, "base64"));
		const rawSecret = StableLibCrypto.deriveSharedSecret(myIdentity.privateKey, contactPub);
		const secret = StableLibCrypto.deriveKeys(
			rawSecret,
			new Uint8Array(0),
			Buffer.from("StableLibSessionV1")
		);

		await storage.saveSessionSecret(contactId, secret, peerIdentityKey);
		console.log("✅ [StableCrypto] Session established with", contactId);
		return secret;
	}

	static async encrypt(userId: string, contactId: string, plaintext: string): Promise<string> {
		const secret = await this.ensureSession(userId, contactId);
		const plainBytes = Buffer.from(plaintext, "utf8");

		const { ciphertext, nonce } = await StableLibCrypto.encrypt(secret, plainBytes);

		const payload = {
			n: Buffer.from(nonce).toString("base64"),
			c: Buffer.from(ciphertext).toString("base64"),
			v: "stable.1",
		};

		return "STB:" + Buffer.from(JSON.stringify(payload)).toString("base64");
	}

	static async decrypt(userId: string, contactId: string, encryptedData: string): Promise<string> {
		if (!encryptedData.startsWith("STB:")) {
			throw new Error("Invalid Stablelib message format");
		}

		prunePoison();
		const poisonId = poisonKey(userId, contactId, encryptedData);
		if (poisonCiphertexts.has(poisonId)) {
			throw new Error("Decryption failed (Stablelib poison cache)");
		}

		const base64Payload = encryptedData.substring(4);
		const payload = JSON.parse(Buffer.from(base64Payload, "base64").toString("utf8"));
		const nonce = new Uint8Array(Buffer.from(payload.n, "base64"));
		const ciphertext = new Uint8Array(Buffer.from(payload.c, "base64"));

		const tryDecrypt = async (forceRefresh: boolean) => {
			const secret = await this.ensureSession(userId, contactId, { forceRefresh });
			const decrypted = StableLibCrypto.decrypt(secret, nonce, ciphertext);
			if (!decrypted) throw new Error("Decryption failed (Stablelib)");
			return Buffer.from(decrypted).toString("utf8");
		};

		try {
			return await tryDecrypt(false);
		} catch (firstError) {
			const sessionKey = cacheKey(userId, contactId);
			const lastRefresh = forceRefreshCooldown.get(sessionKey);
			const canRefresh =
				!lastRefresh || Date.now() - lastRefresh.at >= FORCE_REFRESH_COOLDOWN_MS;

			if (!canRefresh) {
				poisonCiphertexts.set(poisonId, Date.now());
				throw firstError;
			}

			forceRefreshCooldown.set(sessionKey, { at: Date.now() });
			const storage = getStableStorage(userId);
			await storage.clearSession(contactId);
			try {
				return await tryDecrypt(true);
			} catch {
				poisonCiphertexts.set(poisonId, Date.now());
				throw firstError;
			}
		}
	}

	static async clearLocalCrypto(userId: string): Promise<void> {
		await getStableStorage(userId).clearAll();
		publishedIdentityKeys.delete(userId);
		for (const key of [...forceRefreshCooldown.keys()]) {
			if (key.startsWith(`${userId}:`)) forceRefreshCooldown.delete(key);
		}
		for (const key of [...poisonCiphertexts.keys()]) {
			if (key.startsWith(`${userId}:`)) poisonCiphertexts.delete(key);
		}
	}
}
