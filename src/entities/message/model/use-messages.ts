import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ensureStableSession, encryptMessage, decryptMessage } from "@/shared/lib/crypto";
import { axiosInstance } from "@/shared/api/axiosClient";
import { connectSocket, disconnectSocket } from "@/shared/lib/realtime/socket";
import { listByContact, saveByContact } from "@/shared/lib/local-db/messages";
import { generateChatId } from "@/shared/lib/chat-id";
import { trackRealtimeError, trackRealtimeEvent } from "@/shared/lib/telemetry/realtime";
import type { Message, CreateMessageData } from "./types";

const DECRYPT_CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_DECRYPT_CACHE_ENTRIES = 500;

/**
 * Hook de domínio para gerenciar mensagens de um chat.
 *
 * @param contactId - ID do contato
 * @param userId    - ID do usuário autenticado (injetado pela camada superior)
 */
export function useMessages(contactId: string, userId: string | undefined) {
	const [decryptedMessages, setDecryptedMessages] = useState<Message[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const decryptCacheRef = useRef<Map<string, { text: string; timestamp: number }>>(new Map());

	const chatId = useMemo(() => {
		if (!userId || !contactId) return null;
		return generateChatId(userId, contactId);
	}, [userId, contactId]);

	const loadMessages = useCallback(async () => {
		const startedAt = Date.now();
		if (!userId || !chatId || !contactId) {
			setDecryptedMessages([]);
			return;
		}
		setIsLoading(true);
		const cached = await listByContact(contactId);
		if (cached.length > 0) {
			setDecryptedMessages(cached);
		}
		try {
			const { data } = await axiosInstance.get(`/chat/messages/${contactId}`, {
				params: { limit: 100, offset: 0 },
			});
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

			const decryptWithCache = async (row: any): Promise<string> => {
				const cacheKey = `${String(row.id)}:${String(row.content)}`;
				const cached = decryptCacheRef.current.get(cacheKey);
				if (cached && Date.now() - cached.timestamp < DECRYPT_CACHE_TTL_MS) {
					trackRealtimeEvent({
						stage: "message_decrypt",
						result: "info",
						durationMs: 0,
						details: { cacheHit: true, messageId: String(row.id) },
					});
					return cached.text;
				}

				const decryptStartedAt = Date.now();
				const text = await decryptMessage(
					row.content,
					chatId,
					userId,
					String(row.senderId),
					String(row.receiverId),
					String(row.id),
				);
				decryptCacheRef.current.set(cacheKey, { text, timestamp: Date.now() });
				trackRealtimeEvent({
					stage: "message_decrypt",
					result: "success",
					durationMs: Date.now() - decryptStartedAt,
					details: { cacheHit: false, messageId: String(row.id) },
				});
				return text;
			};

			const decrypted = await Promise.all(
				rows.map(async (row: any) => ({
					id: row.id,
					chatId,
					senderId: row.senderId,
					receiverId: row.receiverId,
					text: await decryptWithCache(row),
					timestamp: row.timestamp,
					read: Boolean(row.isRead),
					viewedAt: null,
					createdAt: row.timestamp,
					updatedAt: row.timestamp,
				})),
			);
			maybeClearExpiredDecryptCache();
			setDecryptedMessages(decrypted);
			await saveByContact(contactId, decrypted);
			trackRealtimeEvent({
				stage: "message_load",
				result: "success",
				durationMs: Date.now() - startedAt,
				details: { contactId, rows: rows.length },
			});
		} catch (error) {
			console.error("[Entities/Message] Error loading messages:", error);
			trackRealtimeError(
				{
					stage: "message_load",
					durationMs: Date.now() - startedAt,
					details: { contactId },
				},
				error
			);
		} finally {
			setIsLoading(false);
		}
	}, [userId, chatId, contactId]);

	useEffect(() => {
		loadMessages();
	}, [loadMessages]);

	useEffect(() => {
		if (!userId || !contactId) return;

		(async () => {
			try {
				await ensureStableSession(userId, contactId);
			} catch (e) {
				console.warn("[Entities/Message] Stable session warning:", e);
			}
		})();
	}, [userId, contactId]);

	useEffect(() => {
		if (!userId || !contactId) return;

		let mounted = true;
		connectSocket(async (event) => {
			if (!mounted) return;
			if (event.type === "newMessage") {
				const row = event.data as {
					id?: string;
					senderId?: string;
					receiverId?: string;
					content?: string;
					timestamp?: string;
				};

				const senderId = String(row.senderId ?? "");
				const receiverId = String(row.receiverId ?? "");
				const isFromCurrentChat =
					(senderId === contactId && receiverId === userId) || (senderId === userId && receiverId === contactId);

				if (isFromCurrentChat && row.id && row.content) {
					try {
						const decryptStartedAt = Date.now();
						const text = await decryptMessage(
							row.content,
							chatId ?? generateChatId(userId, contactId),
							userId,
							senderId,
							receiverId,
							String(row.id),
						);
						const cacheKey = `${String(row.id)}:${String(row.content)}`;
						decryptCacheRef.current.set(cacheKey, { text, timestamp: Date.now() });
						trackRealtimeEvent({
							stage: "message_decrypt",
							result: "success",
							durationMs: Date.now() - decryptStartedAt,
							details: { source: "socket", messageId: String(row.id) },
						});

						const incoming: Message = {
							id: String(row.id),
							chatId: chatId ?? generateChatId(userId, contactId),
							senderId,
							receiverId,
							text,
							timestamp: row.timestamp ? new Date(row.timestamp) : new Date(),
							read: false,
							viewedAt: null,
							createdAt: row.timestamp ? new Date(row.timestamp) : new Date(),
							updatedAt: row.timestamp ? new Date(row.timestamp) : new Date(),
						};

						setDecryptedMessages((prev) => {
							if (prev.some((message) => message.id === incoming.id)) {
								return prev;
							}
							return [incoming, ...prev];
						});
					} catch (error) {
						console.warn("[Entities/Message] Realtime decrypt failed, using full reload:", error);
						trackRealtimeError(
							{
								stage: "message_decrypt",
								details: { source: "socket", messageId: String(row.id) },
							},
							error
						);
					}
				}

				void loadMessages();
			}
		}).catch((error) => {
			console.error("[Entities/Message] Socket connection error:", error);
		});

		return () => {
			mounted = false;
			disconnectSocket();
		};
	}, [userId, contactId, loadMessages]);

	const sendMessage = useCallback(
		async (messageData: CreateMessageData) => {
			if (!userId) throw new Error("Not authenticated");

			const plaintext = messageData.text.trim();
			if (!plaintext) return;

			try {
				if (!chatId) return;
				const startedAt = Date.now();
				const encryptedContent = await encryptMessage(plaintext, chatId, userId, messageData.receiverId);
				await axiosInstance.post("/chat/messages", {
					receiverId: messageData.receiverId,
					content: encryptedContent,
				});
				trackRealtimeEvent({
					stage: "message_send",
					result: "success",
					durationMs: Date.now() - startedAt,
					details: { contactId, userId },
				});
				void loadMessages();
			} catch (error) {
				console.error("[Entities/Message] Error sending message:", error);
				trackRealtimeError(
					{
						stage: "message_send",
						details: { contactId, userId },
					},
					error
				);
				throw error;
			}
		},
		[userId, chatId, loadMessages],
	);

	const markAsViewed = useCallback(async () => {
		if (!userId || !contactId || !chatId) return;

		try {
			// Read tracking still happens through chat fetch; backend can later expose dedicated endpoint
			await loadMessages();
		} catch (error) {
			console.error("[Entities/Message] Error marking messages as read:", error);
		}
	}, [userId, contactId, chatId, loadMessages]);

	const allMessages = useMemo(() => {
		return [...decryptedMessages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
	}, [decryptedMessages]);

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
