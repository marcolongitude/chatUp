import { useCallback, useEffect, useMemo, useState } from "react";
import { ensureStableSession } from "@/shared/lib/crypto";
import { useLiveQuery } from "@tanstack/react-db";
import { eq, or, and } from "@tanstack/db";
import { messagesCollection, insertEncryptedMessage, decryptMessageRow, type MessageRow } from "@/shared/lib/database";
import { generateChatId } from "@/shared/lib/chat-id";
import type { Message, CreateMessageData } from "./types";

interface ElectricState {
	isConnected: boolean;
	isLoading: boolean;
	error: Error | null;
}

/**
 * Hook de domínio para gerenciar mensagens de um chat.
 *
 * @param contactId - ID do contato
 * @param userId    - ID do usuário autenticado (injetado pela camada superior)
 * @param electric  - estado de conexão Electric (injetado pela camada superior)
 */
export function useMessages(contactId: string, userId: string | undefined, electric: ElectricState) {
	const { isConnected: isElectricConnected, isLoading: isElectricLoading, error: electricError } = electric;
	const [decryptedMessages, setDecryptedMessages] = useState<Message[]>([]);

	const chatId = useMemo(() => {
		if (!userId || !contactId) return null;
		return generateChatId(userId, contactId);
	}, [userId, contactId]);

	const shouldRunQuery = useMemo(() => {
		return !!(chatId && userId && contactId);
	}, [chatId, userId, contactId]);

	const { data: messageRows = [], isLoading } = useLiveQuery((query) => {
		const IMPOSSIBLE_ID = "00000000-0000-0000-0000-000000000000";
		const emptyQuery = query.from({ msg: messagesCollection }).where(({ msg }: any) => eq(msg.id, IMPOSSIBLE_ID));

		if (!shouldRunQuery || !userId || !contactId) {
			return emptyQuery;
		}

		const myId = String(userId);
		const otherId = String(contactId);

		try {
			return query
				.from({ msg: messagesCollection })
				.where(({ msg }: any) => {
					const isMe = or(eq(msg.sender_id, myId), eq(msg.receiver_id, myId));
					const isOther = or(eq(msg.sender_id, otherId), eq(msg.receiver_id, otherId));
					return and(isMe, isOther);
				})
				.orderBy(({ msg }: any) => msg.timestamp, "asc");
		} catch (err) {
			console.error("[Entities/Message] Query building error:", err);
			return emptyQuery;
		}
	});

	useEffect(() => {
		if (!messageRows || !userId || !chatId) {
			setDecryptedMessages([]);
			return;
		}

		(async () => {
			try {
			const decrypted = await Promise.all(messageRows.map((row: MessageRow) => decryptMessageRow(row, userId)));

			type DecryptedRow = Awaited<ReturnType<typeof decryptMessageRow>>;
			const transformed: Message[] = decrypted.map((d: DecryptedRow) => ({
					id: d.id,
					chatId: chatId,
					senderId: d.senderId,
					receiverId: d.receiverId,
					text: d.text,
					timestamp: d.timestamp,
					read: d.read,
					viewedAt: null,
					createdAt: d.timestamp,
					updatedAt: d.timestamp,
				}));

				setDecryptedMessages(transformed);
			} catch (error) {
				console.error("[Entities/Message] Error decrypting messages:", error);
				setDecryptedMessages([]);
			}
		})();
	}, [messageRows, userId, chatId]);

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

	const sendMessage = useCallback(
		async (messageData: CreateMessageData) => {
			if (!userId) throw new Error("Not authenticated");

			const plaintext = messageData.text.trim();
			if (!plaintext) return;

			try {
				await insertEncryptedMessage({
					senderId: userId,
					receiverId: messageData.receiverId,
					content: plaintext,
					timestamp: new Date(),
				});
			} catch (error) {
				console.error("[Entities/Message] Error sending message:", error);
				throw error;
			}
		},
		[userId],
	);

	const markAsViewed = useCallback(async () => {
		if (!userId || !contactId || !chatId) return;

		try {
		const unreadMessages = messageRows?.filter(
			(msg: MessageRow) => msg.receiver_id === userId && msg.sender_id === contactId && !msg.is_read,
		);

		if (unreadMessages && unreadMessages.length > 0) {
			await Promise.all(
				unreadMessages.map((msg: MessageRow) =>
					messagesCollection.update(msg.id, (draft: MessageRow) => {
						draft.is_read = true;
					}),
				),
			);
			}
		} catch (error) {
			console.error("[Entities/Message] Error marking messages as read:", error);
		}
	}, [userId, contactId, chatId, messageRows]);

	const allMessages = useMemo(() => {
		return [...decryptedMessages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
	}, [decryptedMessages]);

	const shouldShowLoading = useMemo(() => {
		if (allMessages.length > 0) return false;
		if (electricError || (!isElectricConnected && !isElectricLoading)) return false;
		return isLoading;
	}, [isLoading, allMessages.length, electricError, isElectricConnected, isElectricLoading]);

	return {
		messages: allMessages,
		isLoading: shouldShowLoading,
		isSyncing: isElectricLoading || isElectricConnected === false,
		error: electricError ? `Offline: ${electricError.message}` : null,
		sendMessage,
		markAsViewed,
	};
}
