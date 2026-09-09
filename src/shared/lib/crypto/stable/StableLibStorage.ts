import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";
import { Buffer } from "buffer";

const DB_NAME = "chatup.db";
let _db: SQLiteDatabase | null = null;

function getDb(): SQLiteDatabase {
	if (!_db) {
		_db = openDatabaseSync(DB_NAME);
		initTables(_db);
	}
	return _db;
}

function initTables(db: SQLiteDatabase) {
	db.execSync(`
        CREATE TABLE IF NOT EXISTS local_stable_identity (
            user_id TEXT PRIMARY KEY,
            public_key TEXT,
            private_key TEXT
        );
    `);

	db.execSync(`
        CREATE TABLE IF NOT EXISTS local_stable_sessions (
            contact_id TEXT PRIMARY KEY,
            user_id TEXT,
            shared_secret TEXT,
            peer_identity_key TEXT,
            created_at INTEGER
        );
    `);

	// Older installs may miss peer_identity_key.
	try {
		db.execSync(`ALTER TABLE local_stable_sessions ADD COLUMN peer_identity_key TEXT`);
	} catch {
		// column already exists
	}
}

export class StableLibStorage {
	constructor(private readonly userId: string) {}

	private get db() {
		return getDb();
	}

	async getIdentity(): Promise<{ publicKey: Uint8Array; privateKey: Uint8Array } | null> {
		const result = await this.db.getFirstAsync<{ public_key: string; private_key: string }>(
			"SELECT public_key, private_key FROM local_stable_identity WHERE user_id = ?",
			[this.userId]
		);
		if (!result) return null;
		return {
			publicKey: new Uint8Array(Buffer.from(result.public_key, "base64")),
			privateKey: new Uint8Array(Buffer.from(result.private_key, "base64")),
		};
	}

	async saveIdentity(publicKey: Uint8Array, privateKey: Uint8Array): Promise<void> {
		const pubBase64 = Buffer.from(publicKey).toString("base64");
		const privBase64 = Buffer.from(privateKey).toString("base64");
		await this.db.runAsync(
			"INSERT OR REPLACE INTO local_stable_identity (user_id, public_key, private_key) VALUES (?, ?, ?)",
			[this.userId, pubBase64, privBase64]
		);
	}

	async getSession(
		contactId: string
	): Promise<{ secret: Uint8Array; peerIdentityKey: string | null } | null> {
		const result = await this.db.getFirstAsync<{
			shared_secret: string;
			peer_identity_key: string | null;
		}>(
			"SELECT shared_secret, peer_identity_key FROM local_stable_sessions WHERE user_id = ? AND contact_id = ?",
			[this.userId, contactId]
		);
		if (!result) return null;
		return {
			secret: new Uint8Array(Buffer.from(result.shared_secret, "base64")),
			peerIdentityKey: result.peer_identity_key ?? null,
		};
	}

	async getSessionSecret(contactId: string): Promise<Uint8Array | null> {
		const session = await this.getSession(contactId);
		return session?.secret ?? null;
	}

	async saveSessionSecret(
		contactId: string,
		secret: Uint8Array,
		peerIdentityKey?: string
	): Promise<void> {
		const secretBase64 = Buffer.from(secret).toString("base64");
		await this.db.runAsync(
			"INSERT OR REPLACE INTO local_stable_sessions (contact_id, user_id, shared_secret, peer_identity_key, created_at) VALUES (?, ?, ?, ?, ?)",
			[contactId, this.userId, secretBase64, peerIdentityKey ?? null, Date.now()]
		);
	}

	async clearSession(contactId: string): Promise<void> {
		await this.db.runAsync("DELETE FROM local_stable_sessions WHERE user_id = ? AND contact_id = ?", [
			this.userId,
			contactId,
		]);
	}

	async clearSessions(): Promise<void> {
		await this.db.runAsync("DELETE FROM local_stable_sessions WHERE user_id = ?", [this.userId]);
	}

	async clearAll(): Promise<void> {
		await this.db.runAsync("DELETE FROM local_stable_sessions WHERE user_id = ?", [this.userId]);
		await this.db.runAsync("DELETE FROM local_stable_identity WHERE user_id = ?", [this.userId]);
	}
}

export const getStableStorage = (userId: string) => new StableLibStorage(userId);
