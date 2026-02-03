import { StableLibCrypto } from "./stableLibCrypto";
import { getStableStorage } from "./StableLibStorage";
import { axiosInstance as api } from '@/shared/api';
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

        if (!identity) {
            console.log("🆕 [StableCrypto] Generating new X25519 identity");
            const newPair = await StableLibCrypto.generateKeyPair();
            await storage.saveIdentity(newPair.publicKey, newPair.secretKey);
            identity = { publicKey: newPair.publicKey, privateKey: newPair.secretKey };
        }

        const pubBase64 = Buffer.from(identity.publicKey).toString('base64');

        // Registrar no backend. 
        // Para manter compatibilidade com o schema atual do backend:
        try {
            await api.post('/keys', {
                identityKey: pubBase64,
                registrationId: 0, // Stablelib não usa registrationId, mas o banco exige
                signedPreKey: {
                    keyId: 0,
                    publicKey: pubBase64,
                    signature: pubBase64 // Placeholder
                },
                publicKey: pubBase64 // Compatibilidade legacy
            });
            console.log("✅ [StableCrypto] Registered keys on backend");
        } catch (e) {
            console.warn("⚠️ [StableCrypto] Backend registration failed (maybe already registered)", e);
        }
    }

    static async ensureSession(currentUserId: string, contactId: string): Promise<Uint8Array> {
        const storage = getStableStorage(currentUserId);
        let secret = await storage.getSessionSecret(contactId);

        if (!secret) {
            console.log("🔄 [StableCrypto] No session for", contactId, "initiating handshake...");
            
            // 1. Buscar bundle do contato
            const response = await api.get(`/keys/${contactId}`);
            const data = response.data;

            if (!data || !data.identityKey) {
                throw new Error(`Contact ${contactId} has no public keys registered.`);
            }

            // 2. Derivar segredo (ECDH)
            const myIdentity = await storage.getIdentity();
            if (!myIdentity) throw new Error("Local identity not found. Call bootstrap first.");

            const contactPub = new Uint8Array(Buffer.from(data.identityKey, 'base64'));
            
            // Shared Secret = ECDH(MyPriv, TheirPub)
            const rawSecret = StableLibCrypto.deriveSharedSecret(myIdentity.privateKey, contactPub);
            
            // Refinar com HKDF para segurança extra
            secret = StableLibCrypto.deriveKeys(
                rawSecret, 
                new Uint8Array(0), // Salt
                Buffer.from("StableLibSessionV1") // Info
            );

            // 3. Salvar
            await storage.saveSessionSecret(contactId, secret);
            console.log("✅ [StableCrypto] Session established with", contactId);
        }

        return secret;
    }

    static async encrypt(userId: string, contactId: string, plaintext: string): Promise<string> {
        const secret = await this.ensureSession(userId, contactId);
        const plainBytes = Buffer.from(plaintext, 'utf8');
        
        const { ciphertext, nonce } = await StableLibCrypto.encrypt(secret, plainBytes);
        
        // Formato do payload: nonce:ciphertext (em base64)
        const payload = {
            n: Buffer.from(nonce).toString('base64'),
            c: Buffer.from(ciphertext).toString('base64'),
            v: 'stable.1'
        };

        return "STB:" + Buffer.from(JSON.stringify(payload)).toString('base64');
    }

    static async decrypt(userId: string, contactId: string, encryptedData: string): Promise<string> {
        if (!encryptedData.startsWith("STB:")) {
            throw new Error("Invalid Stablelib message format");
        }

        const base64Payload = encryptedData.substring(4);
        const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf8'));
        
        const secret = await this.ensureSession(userId, contactId);
        const nonce = new Uint8Array(Buffer.from(payload.n, 'base64'));
        const ciphertext = new Uint8Array(Buffer.from(payload.c, 'base64'));

        const decrypted = StableLibCrypto.decrypt(secret, nonce, ciphertext);
        if (!decrypted) throw new Error("Decryption failed (Stablelib)");

        return Buffer.from(decrypted).toString('utf8');
    }
}
