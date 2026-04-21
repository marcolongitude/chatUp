import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { Buffer } from "buffer";

const DB_NAME = 'chatup.db';
let _db: SQLiteDatabase | null = null;

function getDb(): SQLiteDatabase {
    if (!_db) {
        _db = openDatabaseSync(DB_NAME);
        initTables(_db);
    }
    return _db;
}

function initTables(db: SQLiteDatabase) {
    // Identity Key Store (X25519)
    db.execSync(`
        CREATE TABLE IF NOT EXISTS local_stable_identity (
            user_id TEXT PRIMARY KEY,
            public_key TEXT,
            private_key TEXT
        );
    `);

    // Sessions Store (Shared Secrets)
    db.execSync(`
        CREATE TABLE IF NOT EXISTS local_stable_sessions (
            contact_id TEXT PRIMARY KEY,
            user_id TEXT,
            shared_secret TEXT,
            created_at INTEGER
        );
    `);
}

export class StableLibStorage {
    constructor(private readonly userId: string) {}

    private get db() {
        return getDb();
    }

    async getIdentity(): Promise<{ publicKey: Uint8Array; privateKey: Uint8Array } | null> {
        const result = await this.db.getFirstAsync<{ public_key: string, private_key: string }>(
            'SELECT public_key, private_key FROM local_stable_identity WHERE user_id = ?', 
            [this.userId]
        );
        if (!result) return null;
        return {
            publicKey: new Uint8Array(Buffer.from(result.public_key, 'base64')),
            privateKey: new Uint8Array(Buffer.from(result.private_key, 'base64'))
        };
    }

    async saveIdentity(publicKey: Uint8Array, privateKey: Uint8Array): Promise<void> {
        const pubBase64 = Buffer.from(publicKey).toString('base64');
        const privBase64 = Buffer.from(privateKey).toString('base64');
        await this.db.runAsync(
            'INSERT OR REPLACE INTO local_stable_identity (user_id, public_key, private_key) VALUES (?, ?, ?)',
            [this.userId, pubBase64, privBase64]
        );
    }

    async getSessionSecret(contactId: string): Promise<Uint8Array | null> {
        const result = await this.db.getFirstAsync<{ shared_secret: string }>(
            'SELECT shared_secret FROM local_stable_sessions WHERE user_id = ? AND contact_id = ?',
            [this.userId, contactId]
        );
        if (!result) return null;
        return new Uint8Array(Buffer.from(result.shared_secret, 'base64'));
    }

    async saveSessionSecret(contactId: string, secret: Uint8Array): Promise<void> {
        const secretBase64 = Buffer.from(secret).toString('base64');
        await this.db.runAsync(
            'INSERT OR REPLACE INTO local_stable_sessions (user_id, contact_id, shared_secret, created_at) VALUES (?, ?, ?, ?)',
            [this.userId, contactId, secretBase64, Date.now()]
        );
    }

    async clearAll(): Promise<void> {
        await this.db.runAsync('DELETE FROM local_stable_sessions WHERE user_id = ?', [this.userId]);
        await this.db.runAsync('DELETE FROM local_stable_identity WHERE user_id = ?', [this.userId]);
    }
}

export const getStableStorage = (userId: string) => new StableLibStorage(userId);
