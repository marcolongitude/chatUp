import { StableLibCrypto } from "./stableLibCrypto";

describe("StableLibCrypto", () => {
	it("roundtrips encrypt/decrypt between two keypairs (shared secret)", async () => {
		const alice = await StableLibCrypto.generateKeyPair();
		const bob = await StableLibCrypto.generateKeyPair();

		const aliceSecretRaw = StableLibCrypto.deriveSharedSecret(alice.secretKey, bob.publicKey);
		const bobSecretRaw = StableLibCrypto.deriveSharedSecret(bob.secretKey, alice.publicKey);

		const info = new TextEncoder().encode("StableLibSessionV1");
		const aliceKey = StableLibCrypto.deriveKeys(aliceSecretRaw, new Uint8Array(0), info);
		const bobKey = StableLibCrypto.deriveKeys(bobSecretRaw, new Uint8Array(0), info);

		expect(Buffer.from(aliceKey).toString("hex")).toBe(Buffer.from(bobKey).toString("hex"));

		const plaintext = new TextEncoder().encode("ola chatup");
		const { ciphertext, nonce } = await StableLibCrypto.encrypt(aliceKey, plaintext);
		const decrypted = StableLibCrypto.decrypt(bobKey, nonce, ciphertext);

		expect(decrypted).not.toBeNull();
		expect(new TextDecoder().decode(decrypted!)).toBe("ola chatup");
	});
});
