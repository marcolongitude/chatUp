import AsyncStorage from "@react-native-async-storage/async-storage";

export type OutboxStatus = "pending" | "sent" | "failed";

export interface OutboxItem {
	clientMsgId: string;
	userId: string;
	receiverId: string;
	contactId: string;
	encryptedContent: string;
	plaintext: string;
	createdAt: string;
	retryCount: number;
	nextRetryAt: string;
	status: OutboxStatus;
	serverId?: string;
	seqNum?: number;
}

const KEY_PREFIX = "@chatup:outbox:";

function keyForUser(userId: string): string {
	return `${KEY_PREFIX}${userId}`;
}

async function readAll(userId: string): Promise<OutboxItem[]> {
	const raw = await AsyncStorage.getItem(keyForUser(userId));
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw) as OutboxItem[];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

async function writeAll(userId: string, items: OutboxItem[]): Promise<void> {
	await AsyncStorage.setItem(keyForUser(userId), JSON.stringify(items));
}

export async function enqueueOutbox(item: OutboxItem): Promise<void> {
	const items = await readAll(item.userId);
	const withoutDup = items.filter((entry) => entry.clientMsgId !== item.clientMsgId);
	withoutDup.push(item);
	await writeAll(item.userId, withoutDup);
}

export async function listPendingOutbox(userId: string, now = new Date()): Promise<OutboxItem[]> {
	const items = await readAll(userId);
	return items.filter(
		(item) => item.status === "pending" && new Date(item.nextRetryAt).getTime() <= now.getTime()
	);
}

export async function markOutboxSent(
	userId: string,
	clientMsgId: string,
	serverId: string,
	seqNum?: number
): Promise<void> {
	const items = await readAll(userId);
	const next = items.map((item) =>
		item.clientMsgId === clientMsgId
			? { ...item, status: "sent" as const, serverId, seqNum, retryCount: item.retryCount }
			: item
	);
	await writeAll(userId, next);
}

export async function markOutboxRetry(
	userId: string,
	clientMsgId: string,
	retryCount: number,
	nextRetryAt: Date,
	failed = false
): Promise<void> {
	const items = await readAll(userId);
	const next = items.map((item) =>
		item.clientMsgId === clientMsgId
			? {
					...item,
					retryCount,
					nextRetryAt: nextRetryAt.toISOString(),
					status: failed ? ("failed" as const) : ("pending" as const),
				}
			: item
	);
	await writeAll(userId, next);
}

export async function getOutboxItem(userId: string, clientMsgId: string): Promise<OutboxItem | null> {
	const items = await readAll(userId);
	return items.find((item) => item.clientMsgId === clientMsgId) ?? null;
}

export function nextBackoffMs(retryCount: number): number {
	return Math.min(60_000, 1000 * 2 ** Math.max(0, retryCount));
}
