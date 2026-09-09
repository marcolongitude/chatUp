const { generateKeyPairFromSeed, sharedKey } = require('@stablelib/x25519');
const { XChaCha20Poly1305 } = require('@stablelib/xchacha20poly1305');
const { HKDF } = require('@stablelib/hkdf');
const { SHA256 } = require('@stablelib/sha256');
const crypto = require('crypto');

function test() {
    console.log("🧪 Testing Stablelib in Node...");

    const seedA = crypto.randomBytes(32);
    const seedB = crypto.randomBytes(32);

    const alice = generateKeyPairFromSeed(new Uint8Array(seedA));
    const bob = generateKeyPairFromSeed(new Uint8Array(seedB));

    const secretAlice = sharedKey(alice.secretKey, bob.publicKey);
    const secretBob = sharedKey(bob.secretKey, alice.publicKey);

    if (Buffer.from(secretAlice).equals(Buffer.from(secretBob))) {
        console.log("✅ ECDH works");
    } else {
        throw new Error("ECDH failed");
    }

    const hkdf = new HKDF(SHA256, secretAlice, new Uint8Array(0), Buffer.from("test"));
    const key = hkdf.expand(32);
    console.log("✅ HKDF works");

    const cipher = new XChaCha20Poly1305(key);
    const nonce = crypto.randomBytes(cipher.nonceLength);
    const plaintext = Buffer.from("Hello Stablelib", "utf8");
    const ciphertext = cipher.seal(new Uint8Array(nonce), new Uint8Array(plaintext));
    
    console.log("✅ Encryption works");

    const decrypted = cipher.open(new Uint8Array(nonce), ciphertext);
    if (Buffer.from(decrypted).toString('utf8') === "Hello Stablelib") {
        console.log("✅ Decryption works");
        console.log("🎉 ALL TESTS PASSED!");
    } else {
        throw new Error("Decryption failed");
    }
}

try {
    test();
} catch (e) {
    console.error("❌ Test failed:", e.message);
    process.exit(1);
}
