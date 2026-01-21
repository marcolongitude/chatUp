import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from '@/features/auth';
import { ensureSignalSession } from "@/shared/lib/crypto";
import { useLiveQuery, eq, or, and } from "@tanstack/react-db";
import { messagesCollection, insertEncryptedMessage, decryptMessageRow } from "@/shared/lib/database/collections";
import { useElectric } from "@/app/providers/electric";
import { generateChatId } from "@/entities/chat";
import type { Message, CreateMessageData } from "./types";

/**
 * Hook de domínio para gerenciar mensagens de um chat
 * Encapsula lógica de busca, descriptografia e sincronização
 */
export function useMessages(contactId: string) {
	const { user } = useAuth();
	const { isConnected: isElectricConnected, isLoading: isElectricLoading, error: electricError } = useElectric();
	const [decryptedMessages, setDecryptedMessages] = useState<Message[]>([]);

	// Generate chat ID usando lib da entidade chat
	const chatId = useMemo(() => {
		if (!user || !contactId) return null;
		return generateChatId(user.id, contactId);
	}, [user?.id, contactId]);

	// Controle de execução da query
	const shouldRunQuery = useMemo(() => {
		return !!(chatId && user?.id && contactId);
	}, [chatId, user?.id, contactId]);

	// Query do Electric SQL via React-DB
	const {
		data: messageRows = [],
		isLoading,
	} = useLiveQuery((q) => {
		const IMPOSSIBLE_ID = '00000000-0000-0000-0000-000000000000';
		const emptyQuery = q.from({ msg: messagesCollection }).where(({ msg }) => eq(msg.id, IMPOSSIBLE_ID));

		if (!shouldRunQuery || !user?.id || !contactId) {
			return emptyQuery;
		}

		const myId = String(user.id);
		const otherId = String(contactId);

		try {
			return q
				.from({ msg: messagesCollection })
				.where(({ msg }) => {
					const isMe = or(eq(msg.sender_id, myId), eq(msg.receiver_id, myId));
					const isOther = or(eq(msg.sender_id, otherId), eq(msg.receiver_id, otherId));
					return and(isMe, isOther);
				})
				.orderBy(({ msg }) => msg.timestamp, "asc");
		} catch (err) {
			console.error('❌ [Entities/Message] Query building error:', err);
			return emptyQuery;
		}
	});

	// Descriptografia de mensagens reativa
	useEffect(() => {
		if (!messageRows || !user || !chatId) {
			setDecryptedMessages([]);
			return;
		}

		(async () => {
			try {
				const decrypted = await Promise.all(messageRows.map((row) => decryptMessageRow(row, user.id)));

				const transformed: Message[] = decrypted.map((d) => ({
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
				console.error("❌ [Entities/Message] Error decrypting messages:", error);
				setDecryptedMessages([]);
			}
		})();
	}, [messageRows, user?.id, chatId]);

	// Garantir sessão Signal com o contato
	useEffect(() => {
		if (!user || !contactId) return;

		(async () => {
			try {
				await ensureSignalSession(user.id, contactId);
			} catch (e) {
				console.warn("[Entities/Message] Signal session warning:", e);
			}
		})();
	}, [user?.id, contactId]);

	// Envio de mensagem (delegação para lib/database)
	const sendMessage = useCallback(
		async (messageData: CreateMessageData) => {
			if (!user) throw new Error("Not authenticated");

			const plaintext = messageData.text.trim();
			if (!plaintext) return;

			try {
				await insertEncryptedMessage({
					senderId: user.id,
					receiverId: messageData.receiverId,
					content: plaintext,
					timestamp: new Date(),
				});
			} catch (error) {
				console.error("❌ [Entities/Message] Error sending message:", error);
				throw error;
			}
		},
		[user]
	);

	// Marca mensagens como visualizadas
	const markAsViewed = useCallback(async () => {
		if (!user || !contactId || !chatId) return;

		try {
			const unreadMessages = messageRows?.filter(
				(msg) => msg.receiver_id === user.id && msg.sender_id === contactId && !msg.is_read
			);

			if (unreadMessages && unreadMessages.length > 0) {
				await Promise.all(
					unreadMessages.map((msg) =>
						messagesCollection.update(msg.id, (draft) => {
							draft.is_read = true;
						})
					)
				);
			}
		} catch (error) {
			console.error("[Entities/Message] Error marking messages as read:", error);
		}
	}, [user, contactId, chatId, messageRows]);

	// Local SQLite state (Offline Fallback)
	const [localMessages, setLocalMessages] = useState<Message[]>([]);

	useEffect(() => {
		if (!chatId) return;

		let isMounted = true;
		const fetchLocal = async () => {
			try {
				const { getMessages: getLocalMessages } = require("@/shared/lib/database");
				const localData = await getLocalMessages(chatId, 50);
				if (isMounted && localData.length > 0) {
					setLocalMessages(localData);
				}
			} catch (err) {
				console.error("❌ [Entities/Message] Erro ao buscar mensagens locais:", err);
			}
		};

		fetchLocal();
	}, [chatId]);

	// Combinação do estado Local + Electric
	const allMessages = useMemo(() => {
		const combined = new Map<string, Message>();
		
		localMessages.forEach(msg => combined.set(msg.id, msg));
		decryptedMessages.forEach(msg => combined.set(msg.id, msg));
		
		return Array.from(combined.values()).sort((a, b) => 
			new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
		);
	}, [localMessages, decryptedMessages]);

	// Lógica de carregamento inteligente
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
