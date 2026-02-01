import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import type { Direction, KeyPairType, StorageType } from "libsignal-protocol-typescript";
import { arrayBufferToBase64, base64ToArrayBuffer } from "@/shared/lib/crypto/utils";

/**
 * SignalStorage implementation using direct SQLite (Expo SQLite)
 * 
 * Replaces AsyncStorage/MMKV to centralize data in the 'chatup.db' database files.
 * Uses direct SQL because accessing the TanStack DB imperative client is complex in this context.
 */

const DB_NAME = 'chatup.db';
let _db: SQLiteDatabase | null = null;

function getDb(): SQLiteDatabase {
    if (!_db) {
        // Use synchronous open for simplicity in accessing via methods, 
        // though methods themselves are async.
        _db = openDatabaseSync(DB_NAME);
        initTables(_db);
    }
    return _db;
}

function initTables(db: SQLiteDatabase) {
    // Identity Key Store
    db.execSync(`
        CREATE TABLE IF NOT EXISTS local_signal_identity (
            user_id TEXT PRIMARY KEY,
            identity_public_key TEXT,
            identity_private_key TEXT,
            registration_id INTEGER
        );
    `);

    // Pre-Keys Store
    db.execSync(`
        CREATE TABLE IF NOT EXISTS local_signal_pre_keys (
            key_id INTEGER PRIMARY KEY,
            user_id TEXT,
            public_key TEXT,
            private_key TEXT
        );
    `);

    // Signed Pre-Keys Store
    db.execSync(`
        CREATE TABLE IF NOT EXISTS local_signal_signed_pre_keys (
            key_id INTEGER PRIMARY KEY,
            user_id TEXT,
            public_key TEXT,
            private_key TEXT,
            signature TEXT,
            created_at INTEGER
        );
    `);

    // Sessions Store
    db.execSync(`
        CREATE TABLE IF NOT EXISTS local_signal_sessions (
            session_id TEXT PRIMARY KEY,
            user_id TEXT,
            record TEXT
        );
    `);

    // Trusted Identities (TOFU)
    db.execSync(`
        CREATE TABLE IF NOT EXISTS local_signal_trusted_identities (
            identifier TEXT PRIMARY KEY,
            public_key TEXT,
            added_at INTEGER
        );
    `);
    
    // Metadata (Counters)
    db.execSync(`
        CREATE TABLE IF NOT EXISTS local_signal_metadata (
            key TEXT PRIMARY KEY,
            value INTEGER
        );
    `);
}

interface EncodedKeyPair {
	pubKey: string;
	privKey: string;
}

const encodePair = (pair: KeyPairType): EncodedKeyPair => ({
	pubKey: arrayBufferToBase64(pair.pubKey),
	privKey: arrayBufferToBase64(pair.privKey),
});

const decodePair = (encoded?: EncodedKeyPair | null): KeyPairType | undefined => {
	if (!encoded || !encoded.pubKey || !encoded.privKey) {
		return undefined;
	}
	return {
		pubKey: base64ToArrayBuffer(encoded.pubKey),
		privKey: base64ToArrayBuffer(encoded.privKey),
	};
};

export class SignalStorage implements StorageType {
	constructor(private readonly userId: string) {}

    private get db() {
        return getDb();
    }

	// IDENTITY KEYS
	async getIdentityKeyPair(): Promise<KeyPairType | undefined> {
        try {
            const result = await this.db.getFirstAsync<{ identity_public_key: string, identity_private_key: string }>(
                'SELECT identity_public_key, identity_private_key FROM local_signal_identity WHERE user_id = ?', 
                [this.userId]
            );
            if (!result) return undefined;
            return decodePair({ pubKey: result.identity_public_key, privKey: result.identity_private_key });
        } catch (error) {
            console.error("SignalStorage: Error fetching identity key", error);
            return undefined;
        }
	}

	async setIdentityKeyPair(pair: KeyPairType): Promise<void> {
        const encoded = encodePair(pair);
        try {
            // Check existence
            const existing = await this.db.getFirstAsync('SELECT user_id FROM local_signal_identity WHERE user_id = ?', [this.userId]);
            if (existing) {
                await this.db.runAsync(
                    'UPDATE local_signal_identity SET identity_public_key = ?, identity_private_key = ? WHERE user_id = ?',
                    [encoded.pubKey, encoded.privKey, this.userId]
                );
            } else {
                await this.db.runAsync(
                    'INSERT INTO local_signal_identity (user_id, identity_public_key, identity_private_key, registration_id) VALUES (?, ?, ?, ?)',
                    [this.userId, encoded.pubKey, encoded.privKey, 0]
                );
            }
        } catch (error) {
             console.error("SignalStorage: Error setting identity key", error);
        }
	}

	async getLocalRegistrationId(): Promise<number | undefined> {
        try {
            const result = await this.db.getFirstAsync<{ registration_id: number }>(
                'SELECT registration_id FROM local_signal_identity WHERE user_id = ?', 
                [this.userId]
            );
            return (result && result.registration_id !== 0) ? result.registration_id : undefined;
        } catch (error) { return undefined; }
	}

	async setLocalRegistrationId(id: number): Promise<void> {
        try {
            const existing = await this.db.getFirstAsync('SELECT user_id FROM local_signal_identity WHERE user_id = ?', [this.userId]);
            if (existing) {
                await this.db.runAsync('UPDATE local_signal_identity SET registration_id = ? WHERE user_id = ?', [id, this.userId]);
            } else {
                 await this.db.runAsync(
                    'INSERT INTO local_signal_identity (user_id, identity_public_key, identity_private_key, registration_id) VALUES (?, ?, ?, ?)',
                    [this.userId, "", "", id]
                );
            }
        } catch (e) { console.error("SignalStorage: Error setting registration ID", e); }
	}

    // PRE-KEYS
	async loadPreKey(keyId: number | string): Promise<KeyPairType | undefined> {
        const id = Number(keyId);
        try {
            const row = await this.db.getFirstAsync<{ public_key: string, private_key: string }>(
                'SELECT public_key, private_key FROM local_signal_pre_keys WHERE key_id = ?', 
                [id]
            );
            if (!row) return undefined;
            return decodePair({ pubKey: row.public_key, privKey: row.private_key });
        } catch { return undefined; }
	}

	async storePreKey(keyId: number | string, keyPair: KeyPairType): Promise<void> {
        const id = Number(keyId);
        const encoded = encodePair(keyPair);
        try {
            await this.db.runAsync(
                'INSERT OR REPLACE INTO local_signal_pre_keys (key_id, user_id, public_key, private_key) VALUES (?, ?, ?, ?)',
                [id, this.userId, encoded.pubKey, encoded.privKey]
            );
        } catch (e) { console.error("SignalStorage: prekey store error", e); }
	}

	async removePreKey(keyId: number | string): Promise<void> {
        const id = Number(keyId);
        try { await this.db.runAsync('DELETE FROM local_signal_pre_keys WHERE key_id = ?', [id]); } catch {}
	}

    // SIGNED PRE-KEYS
	async loadSignedPreKey(keyId: number | string): Promise<KeyPairType | undefined> {
        const id = Number(keyId);
        try {
            const row = await this.db.getFirstAsync<{ public_key: string, private_key: string }>(
                'SELECT public_key, private_key FROM local_signal_signed_pre_keys WHERE key_id = ?',
                [id]
            );
            if (!row) return undefined;
            return decodePair({ pubKey: row.public_key, privKey: row.private_key });
        } catch { return undefined; }
	}

	async storeSignedPreKey(keyId: number | string, keyPair: KeyPairType): Promise<void> {
        const id = Number(keyId);
        const encoded = encodePair(keyPair);
        try {
            // Check if exists to preserve signature
            const existing = await this.db.getFirstAsync('SELECT key_id FROM local_signal_signed_pre_keys WHERE key_id = ?', [id]);
            if (existing) {
                await this.db.runAsync(
                    'UPDATE local_signal_signed_pre_keys SET public_key = ?, private_key = ? WHERE key_id = ?',
                    [encoded.pubKey, encoded.privKey, id]
                );
            } else {
                await this.db.runAsync(
                    'INSERT INTO local_signal_signed_pre_keys (key_id, user_id, public_key, private_key, signature, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                    [id, this.userId, encoded.pubKey, encoded.privKey, "", Date.now()]
                );
            }
        } catch(e) { console.error("SignalStorage: signed prekey store error", e); }
	}

	async removeSignedPreKey(keyId: number | string): Promise<void> {
        const id = Number(keyId);
        try { await this.db.runAsync('DELETE FROM local_signal_signed_pre_keys WHERE key_id = ?', [id]); } catch {}
	}

	async storeSignedPreKeySignature(keyId: number | string, signature: ArrayBuffer): Promise<void> {
		const id = Number(keyId);
        const sigBase64 = arrayBufferToBase64(signature);
        try {
            await this.db.runAsync(
                'UPDATE local_signal_signed_pre_keys SET signature = ? WHERE key_id = ?',
                [sigBase64, id]
            );
        } catch(e) { console.error(e); }
	}

	async loadSignedPreKeySignature(keyId: number | string): Promise<ArrayBuffer | undefined> {
		const id = Number(keyId);
        try {
            const row = await this.db.getFirstAsync<{ signature: string }>('SELECT signature FROM local_signal_signed_pre_keys WHERE key_id = ?', [id]);
            return (row && row.signature) ? base64ToArrayBuffer(row.signature) : undefined;
        } catch { return undefined; }
	}

    // SESSIONS
	async storeSession(encodedAddress: string, record: string): Promise<void> {
        try {
            await this.db.runAsync(
                'INSERT OR REPLACE INTO local_signal_sessions (session_id, user_id, record) VALUES (?, ?, ?)',
                [encodedAddress, this.userId, record]
            );
        } catch(e) { console.error("SignalStorage: store session error", e); }
	}

	async loadSession(encodedAddress: string): Promise<string | undefined> {
        try {
            const row = await this.db.getFirstAsync<{ record: string }>('SELECT record FROM local_signal_sessions WHERE session_id = ?', [encodedAddress]);
            return row?.record;
        } catch { return undefined; }
	}

	async deleteSession(encodedAddress: string): Promise<void> {
        try { await this.db.runAsync('DELETE FROM local_signal_sessions WHERE session_id = ?', [encodedAddress]); } catch {}
	}
    
    // TRUSTED IDENTITIES
	async isTrustedIdentity(identifier: string, identityKey: ArrayBuffer, _direction: Direction): Promise<boolean> {
        try {
            const row = await this.db.getFirstAsync<{ public_key: string }>('SELECT public_key FROM local_signal_trusted_identities WHERE identifier = ?', [identifier]);
            if (!row) return true; // TOFU
            return row.public_key === arrayBufferToBase64(identityKey);
        } catch { return true; }
	}

	async saveIdentity(identifier: string, publicKey: ArrayBuffer): Promise<boolean> {
		const encoded = arrayBufferToBase64(publicKey);
        try {
            const row = await this.db.getFirstAsync<{ public_key: string }>('SELECT public_key FROM local_signal_trusted_identities WHERE identifier = ?', [identifier]);
            if (row && row.public_key === encoded) return false;
            
            await this.db.runAsync(
                'INSERT OR REPLACE INTO local_signal_trusted_identities (identifier, public_key, added_at) VALUES (?, ?, ?)',
                [identifier, encoded, Date.now()]
            );
            return true;
        } catch { return false; }
	}
    
    // METADATA
    private async getCounter(key: string): Promise<number> {
        // Need to namespace key by user? or assume counters are somewhat global per signal store instance of a user context
        // The original code passed userId to constructor.
        // Let's use namespaced key: `{userId}_{key}`
        const fullKey = `${this.userId}_${key}`;
        try {
            const row = await this.db.getFirstAsync<{ value: number }>('SELECT value FROM local_signal_metadata WHERE key = ?', [fullKey]);
            return row ? row.value : 0;
        } catch { return 0; }
    }
    
    private async setCounter(key: string, val: number): Promise<void> {
        const fullKey = `${this.userId}_${key}`;
        try {
            await this.db.runAsync('INSERT OR REPLACE INTO local_signal_metadata (key, value) VALUES (?, ?)', [fullKey, val]);
        } catch {}
    }

	async getLastSignedPreKeyId(): Promise<number> { return this.getCounter('lastSignedPreKeyId'); }
	async setLastSignedPreKeyId(id: number): Promise<void> { await this.setCounter('lastSignedPreKeyId', id); }

	async getActiveSignedPreKeyId(): Promise<number | undefined> { return this.getCounter('activeSignedPreKeyId'); }
	async setActiveSignedPreKeyId(id: number): Promise<void> { await this.setCounter('activeSignedPreKeyId', id); }

	async getLastPreKeyId(): Promise<number> { return this.getCounter('lastPreKeyId'); }
	async setLastPreKeyId(id: number): Promise<void> { await this.setCounter('lastPreKeyId', id); }

	async clearAll(): Promise<void> {
        try {
             await this.db.runAsync('DELETE FROM local_signal_sessions WHERE user_id = ?', [this.userId]);
             await this.db.runAsync('DELETE FROM local_signal_identity WHERE user_id = ?', [this.userId]);
             await this.db.runAsync('DELETE FROM local_signal_pre_keys WHERE user_id = ?', [this.userId]);
             await this.db.runAsync('DELETE FROM local_signal_signed_pre_keys WHERE user_id = ?', [this.userId]);
             // Metadata
             await this.db.runAsync('DELETE FROM local_signal_metadata WHERE key LIKE ?', [`${this.userId}_%`]);
        } catch(e) { console.error("SignalStorage: clearAll error", e); }
	}
}

export const getSignalStorage = (userId: string): SignalStorage => new SignalStorage(userId);
