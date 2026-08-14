import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import * as ExpoCrypto from "expo-crypto";
import { ensureStableSession, encryptMessage, decryptMessage } from "@/shared/lib/crypto";
import { axiosInstance } from "@/shared/api/axiosClient";
import { subscribeSocket } from "@/shared/lib/realtime/socket";
import { listByContact, saveByContact } from "@/shared/lib/local-db/messages";
import {
	enqueueOutbox,
	listPendingOutbox,
	markOutboxRetry,
	markOutboxSent,
	nextBackoffMs,
} from "@/shared/lib/local-db/outbox";
import { generateChatId } from "@/shared/lib/chat-id";
import { trackRealtimeError, trackRealtimeEvent } from "@/shared/lib/telemetry/realtime";
import { deliveryFromFlags } from "../lib/delivery-status";
import type { Message, CreateMessageData, MessageDeliveryStatus } from "./types";

const DECRYPT_CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_DECRYPT_CACHE_ENTRIES = 500;
const OUTBOX_MAX_RETRIES = 8;
const OUTBOX_POLL_MS = 5000;

function messageKey(message: Message): string {
	return message.clientMsgId ? `c:${message.clientMsgId}` : `i:${message.id}`;
}

function mergeMessages(base: Message[], incoming: Message[]): Message[] {
	const byKey = new Map<string, Message>();
	for (const message of base) {
		byKey.set(messageKey(message), message);
		byKey.set(`i:${message.id}`, message);
	}
	for (const message of incoming) {
		const key = messageKey(message);
		const existing = byKey.get(key) ?? (message.clientMsgId ? byKey.get(`i:${message.id}`) : undefined);
		byKey.set(key, existing ? { ...existing, ...message, id: message.id || existing.id } : message);
		byKey.set(`i:${message.id}`, byKey.get(key)!);
	}
	const unique = new Map<string, Message>();
	for (const message of byKey.values()) {
		unique.set(message.id, message);
	}
	return Array.from(unique.values());
}

function compareMessages(a: Message, b: Message): number {
	const aSeq = a.seqNum ?? 0;
	const bSeq = b.seqNum ?? 0;
	if (aSeq > 0 && bSeq > 0 && aSeq !== bSeq) return aSeq - bSeq;
	return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
}

/**
 * Hook de domínio para gerenciar mensagens de um chat.
 */
export function useMessages(contactId: string, userId: string | undefined) {
	const [decryptedMessages, setDecryptedMessages] = useState<Message[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const decryptCacheRef = useRef<Map<string, { text: string; timestamp: number }>>(new Map());
	const loadSeqRef = useRef(0);
	const messagesRef = useRef<Message[]>([]);

	const chatId = useMemo(() => {
		if (!userId || !contactId) return null;
		return generateChatId(userId, contactId);
	}, [userId, contactId]);

	useEffect(() => {
		messagesRef.current = decryptedMessages;
	}, [decryptedMessages]);

	const persist = useCallback(
		async (next: Message[]) => {
			if (!contactId) return;
			await saveByContact(contactId, next);
		},
		[contactId]
	);

	const patchLocalMessage = useCallback(
		(matcher: (message: Message) => boolean, patch: Partial<Message>) => {
			setDecryptedMessages((prev) => {
				const next = prev.map((message) => (matcher(message) ? { ...message, ...patch } : message));
				void persist(next);
				return next;
			});
		},
		[persist]
	);

	const loadMessages = useCallback(
		async (options?: { applyCache?: boolean }) => {
			const applyCache = options?.applyCache ?? true;
			const startedAt = Date.now();
			const seq = ++loadSeqRef.current;
			if (!userId || !chatId || !contactId) {
				setDecryptedMessages([]);
				return;
			}
			setIsLoading(true);
			if (applyCache) {
				const cached = await listByContact(contactId);
				if (seq !== loadSeqRef.current) return;
				if (cached.length > 0) {
					setDecryptedMessages((prev) => (prev.length === 0 ? cached : mergeMessages(prev, cached)));
				}
			}
			try {
				const { data } = await axiosInstance.get(`/chat/messages/${contactId}`, {
					params: { limit: 100, offset: 0 },
				});
				if (seq !== loadSeqRef.current) return;
				const rows = Array.isArray(data) ? data : [];

				const maybeClearExpiredDecryptCache = () => {
					const now = Date.now();
					for (const [cacheKey, entry] of decryptCacheRef.current.entries()) {
						if (now - entry.timestamp > DECRYPT_CACHE_TTL_MS) {
							decryptCacheRef.current.delete(cacheKey);
						}
					}
					if (decryptCacheRef.current.size > MAX_DECRYPT_CACHE_ENTRIES) {
						const ordered = Array.from(decryptCacheRef.current.entries()).sort(
							(a, b) => a[1].timestamp - b[1].timestamp
						);
						const toRemove = ordered.slice(0, decryptCacheRef.current.size - MAX_DECRYPT_CACHE_ENTRIES);
						for (const [cacheKey] of toRemove) {
							decryptCacheRef.current.delete(cacheKey);
						}
					}
				};

				const decryptWithCache = async (row: {
					id: string;
					content: string;
					senderId: string;
					receiverId: string;
				}): Promise<string> => {
					const cacheKey = `${String(row.id)}:${String(row.content)}`;
					const cached = decryptCacheRef.current.get(cacheKey);
					if (cached && Date.now() - cached.timestamp < DECRYPT_CACHE_TTL_MS) {
						return cached.text;
					}
					const text = await decryptMessage(
						row.content,
						chatId,
						userId,
						String(row.senderId),
						String(row.receiverId),
						String(row.id)
					);
					decryptCacheRef.current.set(cacheKey, { text, timestamp: Date.now() });
					return text;
				};

				const decrypted = await Promise.all(
					rows.map(async (row: Record<string, unknown>) => {
						const isDelivered = Boolean(row.isDelivered);
						const isRead = Boolean(row.isRead);
						return {
							id: String(row.id),
							chatId,
							senderId: String(row.senderId),
							receiverId: String(row.receiverId),
							text: await decryptWithCache({
								id: String(row.id),
								content: String(row.content),
								senderId: String(row.senderId),
								receiverId: String(row.receiverId),
							}),
							timestamp: row.timestamp as string,
							read: isRead,
							viewedAt: isRead ? (row.timestamp as string) : null,
							createdAt: row.timestamp as string,
							updatedAt: row.timestamp as string,
							clientMsgId: row.clientMsgId ? String(row.clientMsgId) : undefined,
							seqNum: typeof row.seqNum === "number" ? row.seqNum : Number(row.seqNum ?? 0) || undefined,
							deliveryStatus: deliveryFromFlags(isDelivered, isRead),
						} satisfies Message;
					})
				);
				if (seq !== loadSeqRef.current) return;
				maybeClearExpiredDecryptCache();
				setDecryptedMessages((prev) => {
					const next = mergeMessages(prev, decrypted);
					void persist(next);
					return next;
				});
				trackRealtimeEvent({
					stage: "message_load",
					result: "success",
					durationMs: Date.now() - startedAt,
					details: { contactId, rows: rows.length },
				});
			} catch (error) {
				if (seq !== loadSeqRef.current) return;
				console.error("[Entities/Message] Error loading messages:", error);
				trackRealtimeError({ stage: "message_load", durationMs: Date.now() - startedAt, details: { contactId } }, error);
			} finally {
				if (seq === loadSeqRef.current) {
					setIsLoading(false);
				}
			}
		},
		[userId, chatId, contactId, persist]
	);

	const flushOutbox = useCallback(async () => {
		if (!userId) return;
		const pending = await listPendingOutbox(userId);
		for (const item of pending) {
			try {
				const { data } = await axiosInstance.post("/chat/messages", {
					receiverId: item.receiverId,
					content: item.encryptedContent,
					clientMsgId: item.clientMsgId,
				});
				await markOutboxSent(userId, item.clientMsgId, String(data.id), Number(data.seqNum ?? 0) || undefined);
				patchLocalMessage(
					(message) => message.clientMsgId === item.clientMsgId || message.id === `local:${item.clientMsgId}`,
					{
						id: String(data.id),
						seqNum: Number(data.seqNum ?? 0) || undefined,
						deliveryStatus: data.isDelivered ? "delivered" : "sent",
						isLocal: false,
						timestamp: data.timestamp ?? new Date().toISOString(),
					}
				);
			} catch {
				const retryCount = item.retryCount + 1;
				const failed = retryCount >= OUTBOX_MAX_RETRIES;
				await markOutboxRetry(
					userId,
					item.clientMsgId,
					retryCount,
					new Date(Date.now() + nextBackoffMs(retryCount)),
					failed
				);
				if (failed) {
					patchLocalMessage(
						(message) => message.clientMsgId === item.clientMsgId,
						{ deliveryStatus: "failed" }
					);
				}
			}
		}
	}, [userId, patchLocalMessage]);

	useEffect(() => {
		loadMessages();
	}, [loadMessages]);

	useEffect(() => {
		if (!userId || !contactId) return;
		void ensureStableSession(userId, contactId).catch((e) => {
			console.warn("[Entities/Message] Stable session warning:", e);
		});
	}, [userId, contactId]);

	useEffect(() => {
		if (!userId) return;
		void flushOutbox();
		const timer = setInterval(() => {
			void flushOutbox();
		}, OUTBOX_POLL_MS);
		const sub = AppState.addEventListener("change", (state) => {
			if (state === "active") void flushOutbox();
		});
		return () => {
			clearInterval(timer);
			sub.remove();
		};
	}, [userId, flushOutbox]);

	useEffect(() => {
		if (!userId || !contactId) return;

		let mounted = true;
		let unsubscribe: (() => void) | undefined;
		let cancelled = false;

		void subscribeSocket(async (event) => {
			if (!mounted) return;

			if (event.type === "ack") {
				const data = event.data as { clientMsgId?: string; serverId?: string; seqNum?: number };
				if (!data.clientMsgId || !data.serverId) return;
				await markOutboxSent(userId, data.clientMsgId, data.serverId, data.seqNum);
				patchLocalMessage(
					(message) => message.clientMsgId === data.clientMsgId,
					{
						id: data.serverId,
						seqNum: data.seqNum,
						deliveryStatus: "sent",
						isLocal: false,
					}
				);
				return;
			}

			if (event.type === "delivered") {
				const data = event.data as { clientMsgId?: string; messageId?: string };
				patchLocalMessage(
					(message) =>
						(data.clientMsgId != null && message.clientMsgId === data.clientMsgId) ||
						(data.messageId != null && message.id === data.messageId),
					{ deliveryStatus: "delivered" }
				);
				return;
			}

			if (event.type !== "newMessage") return;

			const row = event.data as {
				id?: string;
				senderId?: string;
				receiverId?: string;
				content?: string;
				timestamp?: string;
				clientMsgId?: string;
				seqNum?: number;
				isDelivered?: boolean;
				isRead?: boolean;
			};

			const senderId = String(row.senderId ?? "");
			const receiverId = String(row.receiverId ?? "");
			const isFromCurrentChat =
				(senderId === contactId && receiverId === userId) || (senderId === userId && receiverId === contactId);

			if (isFromCurrentChat && row.id && row.content) {
				try {
					const text = await decryptMessage(
						row.content,
						chatId ?? generateChatId(userId, contactId),
						userId,
						senderId,
						receiverId,
						String(row.id)
					);
					const incoming: Message = {
						id: String(row.id),
						chatId: chatId ?? generateChatId(userId, contactId),
						senderId,
						receiverId,
						text,
						timestamp: row.timestamp ? new Date(row.timestamp) : new Date(),
						read: Boolean(row.isRead),
						viewedAt: row.isRead ? new Date() : null,
						createdAt: row.timestamp ? new Date(row.timestamp) : new Date(),
						updatedAt: row.timestamp ? new Date(row.timestamp) : new Date(),
						clientMsgId: row.clientMsgId,
						seqNum: row.seqNum,
						deliveryStatus: deliveryFromFlags(Boolean(row.isDelivered), Boolean(row.isRead)),
					};
					setDecryptedMessages((prev) => {
						const next = mergeMessages(prev, [incoming]);
						void persist(next);
						return next;
					});
					return;
				} catch (error) {
					trackRealtimeError(
						{ stage: "message_decrypt", details: { source: "socket", messageId: String(row.id) } },
						error
					);
					void loadMessages({ applyCache: false });
					return;
				}
			}

			void loadMessages({ applyCache: false });
		})
			.then((unsub) => {
				if (cancelled) {
					unsub();
					return;
				}
				unsubscribe = unsub;
			})
			.catch((error) => {
				console.error("[Entities/Message] Socket connection error:", error);
			});

		return () => {
			mounted = false;
			cancelled = true;
			unsubscribe?.();
		};
	}, [userId, contactId, chatId, loadMessages, patchLocalMessage, persist]);

	const sendMessage = useCallback(
		async (messageData: CreateMessageData) => {
			if (!userId || !chatId) throw new Error("Not authenticated");

			const plaintext = messageData.text.trim();
			if (!plaintext) return;

			const clientMsgId = ExpoCrypto.randomUUID();
			const startedAt = Date.now();
			const encryptedContent = await encryptMessage(plaintext, chatId, userId, messageData.receiverId);

			const localMessage: Message = {
				id: `local:${clientMsgId}`,
				chatId,
				senderId: userId,
				receiverId: messageData.receiverId,
				text: plaintext,
				timestamp: new Date().toISOString(),
				read: false,
				viewedAt: null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				isLocal: true,
				clientMsgId,
				deliveryStatus: "pending",
			};

			setDecryptedMessages((prev) => {
				const next = mergeMessages(prev, [localMessage]);
				void persist(next);
				return next;
			});

			await enqueueOutbox({
				clientMsgId,
				userId,
				receiverId: messageData.receiverId,
				contactId,
				encryptedContent,
				plaintext,
				createdAt: new Date().toISOString(),
				retryCount: 0,
				nextRetryAt: new Date().toISOString(),
				status: "pending",
			});

			try {
				await flushOutbox();
				trackRealtimeEvent({
					stage: "message_send",
					result: "success",
					durationMs: Date.now() - startedAt,
					details: { contactId, userId, clientMsgId },
				});
			} catch (error) {
				trackRealtimeError({ stage: "message_send", details: { contactId, userId, clientMsgId } }, error);
				// Keep pending in outbox for retry worker.
			}
		},
		[userId, chatId, contactId, persist, flushOutbox]
	);

	const markAsViewed = useCallback(async () => {
		if (!userId || !contactId || !chatId) return;
		try {
			await loadMessages();
		} catch (error) {
			console.error("[Entities/Message] Error marking messages as read:", error);
		}
	}, [userId, contactId, chatId, loadMessages]);

	const allMessages = useMemo(() => [...decryptedMessages].sort(compareMessages), [decryptedMessages]);

	const shouldShowLoading = useMemo(() => {
		if (allMessages.length > 0) return false;
		return isLoading;
	}, [isLoading, allMessages.length]);

	return {
		messages: allMessages,
		isLoading: shouldShowLoading,
		isSyncing: false,
		error: null,
		sendMessage,
		markAsViewed,
	};
}
