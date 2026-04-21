import { useCallback, useEffect, useMemo, useState } from "react";
import { ensureStableSession, encryptMessage, decryptMessage } from "@/shared/lib/crypto";
import { axiosInstance } from "@/shared/api/axiosClient";
import { connectSocket, disconnectSocket } from "@/shared/lib/realtime/socket";
import { listByContact, saveByContact } from "@/shared/lib/local-db/messages";
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
	const [isLoading, setIsLoading] = useState(false);

	const chatId = useMemo(() => {
		if (!userId || !contactId) return null;
		return generateChatId(userId, contactId);
	}, [userId, contactId]);

	const loadMessages = useCallback(async () => {
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
			const decrypted = await Promise.all(
				rows.map(async (row: any) => ({
					id: row.id,
					chatId,
					senderId: row.senderId,
					receiverId: row.receiverId,
					text: await decryptMessage(
						row.content,
						chatId,
						userId,
						String(row.senderId),
						String(row.receiverId),
						String(row.id),
					),
					timestamp: row.timestamp,
					read: Boolean(row.isRead),
					viewedAt: null,
					createdAt: row.timestamp,
					updatedAt: row.timestamp,
				})),
			);
			setDecryptedMessages(decrypted);
			await saveByContact(contactId, decrypted);
		} catch (error) {
			console.error("[Entities/Message] Error loading messages:", error);
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
				await loadMessages();
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
				const encryptedContent = await encryptMessage(plaintext, chatId, userId, messageData.receiverId);
				await axiosInstance.post("/chat/messages", {
					receiverId: messageData.receiverId,
					content: encryptedContent,
				});
				await loadMessages();
			} catch (error) {
				console.error("[Entities/Message] Error sending message:", error);
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
