import { StableLibCrypto } from "./stableLibCrypto";
import { getStableStorage } from "./StableLibStorage";
import { axiosInstance as api } from "@/shared/api";
import { Buffer } from "buffer";

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
			console.log("✅ [StableCrypto] Registered keys on backend", {
				createdNewIdentity,
			});
		} catch (e) {
			console.warn("⚠️ [StableCrypto] Backend registration failed", e);
		}
	}

	static async ensureSession(
		currentUserId: string,
		contactId: string,
		options?: { forceRefresh?: boolean }
	): Promise<Uint8Array> {
		const storage = getStableStorage(currentUserId);
		const response = await api.get(`/keys/${contactId}`);
		const data = response.data;

		if (!data || !data.identityKey) {
			throw new Error(`Contact ${contactId} has no public keys registered.`);
		}

		const peerIdentityKey = String(data.identityKey);
		const existing = options?.forceRefresh ? null : await storage.getSession(contactId);
		if (existing?.secret && existing.peerIdentityKey === peerIdentityKey) {
			return existing.secret;
		}

		console.log("🔄 [StableCrypto] Establishing session with", contactId, {
			forceRefresh: Boolean(options?.forceRefresh),
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
			const storage = getStableStorage(userId);
			await storage.clearSession(contactId);
			try {
				return await tryDecrypt(true);
			} catch {
				throw firstError;
			}
		}
	}

	static async clearLocalCrypto(userId: string): Promise<void> {
		await getStableStorage(userId).clearAll();
	}
}
