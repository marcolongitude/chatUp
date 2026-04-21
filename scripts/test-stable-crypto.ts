import { StableLibCrypto } from '../src/shared/lib/crypto/stable/stableLibCrypto';
import { Buffer } from 'buffer';

// Mock expo-crypto for Node environment
const crypto = require('crypto');
const CryptoMock = {
    getRandomBytesAsync: async (size: number) => {
        return new Uint8Array(crypto.randomBytes(size));
    }
};

(global as any).Crypto = CryptoMock;

async function test() {
    console.log("🧪 Testing StableLibCrypto...");

    // 1. Key Generation
    const alice = await StableLibCrypto.generateKeyPair();
    const bob = await StableLibCrypto.generateKeyPair();

    console.log("✅ KeyPairs generated");

    // 2. ECDH
    const secretAlice = StableLibCrypto.deriveSharedSecret(alice.secretKey, bob.publicKey);
    const secretBob = StableLibCrypto.deriveSharedSecret(bob.secretKey, alice.publicKey);

    const match = Buffer.from(secretAlice).equals(Buffer.from(secretBob));
    console.log(match ? "✅ ECDH Shared Secrets match" : "❌ ECDH Shared Secrets DO NOT match");

    if (!match) process.exit(1);

    // 3. HKDF (optional refinement)
    const refinedAlice = StableLibCrypto.deriveKeys(secretAlice, new Uint8Array(0), Buffer.from("test"));
    const refinedBob = StableLibCrypto.deriveKeys(secretBob, new Uint8Array(0), Buffer.from("test"));

    const refinedMatch = Buffer.from(refinedAlice).equals(Buffer.from(refinedBob));
    console.log(refinedMatch ? "✅ HKDF derived keys match" : "❌ HKDF derived keys DO NOT match");

    // 4. Encrypt/Decrypt
    const plaintext = "Hello E2EE with Stablelib!";
    const plainBytes = Buffer.from(plaintext, 'utf8');

    const { ciphertext, nonce } = await StableLibCrypto.encrypt(refinedAlice, plainBytes);
    console.log("✅ Encrypted");

    const decrypted = StableLibCrypto.decrypt(refinedBob, nonce, ciphertext);
    if (decrypted) {
        const resultText = Buffer.from(decrypted).toString('utf8');
        console.log("🔓 Decrypted:", resultText);
        if (resultText === plaintext) {
            console.log("🎉 SUCCESS: Plaintext matches!");
        } else {
            console.log("❌ FAILURE: Plaintext mismatch!");
            process.exit(1);
        }
    } else {
        console.log("❌ FAILURE: Decryption returned null!");
        process.exit(1);
    }
}

test().catch(e => {
    console.error("💥 Test failed with error:", e);
    process.exit(1);
});
