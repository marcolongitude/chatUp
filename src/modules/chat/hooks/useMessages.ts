import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/modules/auth";
import { ensureSignalSession } from "@/core/security";
import { useLiveQuery, eq, or, and } from "@tanstack/react-db";
import { messagesCollection, insertEncryptedMessage, decryptMessageRow } from "@/core/collections";
import { useElectric } from "@/core/electric";
import type { Message, CreateMessageData } from "../types";

// Helper to generate a consistent chat ID (users sorted alphabetically)
function generateChatId(userId1: string, userId2: string): string {
	const sorted = [userId1, userId2].sort();
	return `${sorted[0]}_${sorted[1]}`;
}

export function useMessages(contactId: string) {
	const { user } = useAuth();
	const { isConnected: isElectricConnected, isLoading: isElectricLoading, error: electricError } = useElectric();
	const [decryptedMessages, setDecryptedMessages] = useState<Message[]>([]);

	// Generate chat ID
	const chatId = useMemo(() => {
		if (!user || !contactId) return null;
		return generateChatId(user.id, contactId);
	}, [user?.id, contactId]);

	// Create query - run even if offline (local-first)
	// We only need the IDs to be present
	const shouldRunQuery = useMemo(() => {
		const ready = !!(chatId && user?.id && contactId);
		if (!ready) {
			console.log('⏳ [useMessages] Aguardando IDs para query:', {
				hasChatId: !!chatId,
				hasUser: !!user,
				hasContactId: !!contactId,
			});
		}
		return ready;
	}, [chatId, user?.id, contactId]);

	// Electric SQL query - always call hook (can't be conditional)
	// Return empty query if Electric not ready to prevent errors
	const {
		data: messageRows = [],
		isLoading,
	} = useLiveQuery((q) => {
		// Impossible ID to ensure empty result
		const IMPOSSIBLE_ID = '00000000-0000-0000-0000-000000000000';
		
		// Fallback query
		const emptyQuery = q.from({ msg: messagesCollection }).where(({ msg }) => eq(msg.id, IMPOSSIBLE_ID));

		// Only attempt to build real query if we have all necessary IDs
		if (!shouldRunQuery || !user?.id || !contactId) {
			return emptyQuery;
		}

		// Ensure we have strings and NOT undefined for the compiler
		const myId = String(user.id);
		const otherId = String(contactId);

		try {
			// Building the query piece by piece is safer for some compilers
			return q
				.from({ msg: messagesCollection })
				.where(({ msg }) => {
					// Logic: (sender == me OR receiver == me) AND (sender == other OR receiver == other)
					// This effectively filters messages in this specific 1-to-1 chat
					const isMe = or(eq(msg.sender_id, myId), eq(msg.receiver_id, myId));
					const isOther = or(eq(msg.sender_id, otherId), eq(msg.receiver_id, otherId));
					return and(isMe, isOther);
				})
				.orderBy(({ msg }) => msg.timestamp, "asc");
		} catch (err) {
			console.error('❌ [useMessages] Query building error:', err);
			return emptyQuery;
		}
	});

	// Decrypt messages and transform to Message format
	useEffect(() => {
		console.log(`📊 [useMessages] Dados da query atualizados. Rows: ${messageRows?.length ?? 0}`);
		if (messageRows?.length > 0) {
			console.log(`📊 [useMessages] Exemplo de row:`, JSON.stringify(messageRows[0], null, 2));
		}
		
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
				console.error("❌ [useMessages] Error decrypting messages:", error);
				setDecryptedMessages([]);
			}
		})();
	}, [messageRows, user?.id, chatId]);

	// DEBUG: Verify contact existence in local DB
	useEffect(() => {
		if (contactId) {
			console.log(`🔍 [Debug] Verificando existência do contato ${contactId} no banco local...`);
			// We can't easily query usersCollection directly here without hooks, but we can log intent.
			// Ideally we would use useLiveQuery for this too, but for debug we'll rely on logs.
		}
	}, [contactId]);

	// Ensure Signal session on mount
	useEffect(() => {
		if (!user || !contactId) return;

		(async () => {
			try {
				await ensureSignalSession(user.id, contactId);
			} catch (e) {
				console.warn("Signal session warning:", e);
			}
		})();
	}, [user?.id, contactId]);

	// Send Message with optimistic update
	const sendMessage = useCallback(
		async (messageData: CreateMessageData) => {
			if (!user) throw new Error("Not authenticated");

			const plaintext = messageData.text.trim();
			if (!plaintext) return;

			try {
				// Insert encrypted message - Electric will sync automatically
				await insertEncryptedMessage({
					senderId: user.id,
					receiverId: messageData.receiverId,
					content: plaintext,
					timestamp: new Date(),
				});
			} catch (error) {
				console.error("❌ [useMessages] Error sending message:", error);
				throw error;
			}
		},
		[user]
	);

	// Mark messages as read
	const markAsViewed = useCallback(async () => {
		if (!user || !contactId || !chatId) return;

		try {
			// Update messages collection to mark as read
			// Electric will sync this change
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
			console.error("Error marking messages as read:", error);
		}
	}, [user, contactId, chatId, messageRows]);

	// Load more messages (pagination)
	// Note: With Electric progressive sync, this may not be needed
	// as Electric loads data on-demand based on queries
	const loadMoreMessages = useCallback(async () => {
		// Electric handles pagination automatically via progressive sync
		// This function is kept for API compatibility but may not be needed
		console.log("Load more - Electric handles pagination automatically");
	}, []);

	// Combine loading states
	// FIX: Do not block on isElectricConnected! Offline mode should show local data.
	// We only show loading if we are actually waiting for the query or initial client init.
	const combinedIsLoading = isLoading || isElectricLoading;

	// Log query parameters for debug
	useEffect(() => {
		if (shouldRunQuery && user?.id && contactId) {
			console.log(`🔍 [useMessages] Query Config:`, {
				myId: String(user.id),
				otherId: String(contactId),
				chatId
			});
		}
	}, [shouldRunQuery, user?.id, contactId, chatId]);
	
	// Combine errors - prioritize Electric connection errors but don't blocking UI
	const combinedError = electricError 
		? `Offline: ${electricError.message}` 
		: null;

	// Log connection status for debugging
	useEffect(() => {
		if (!isElectricConnected && !isElectricLoading) {
			// Just log warning, don't treat as critical error blocking UI
			console.log("⚠️ [useMessages] Modo Offline (Electric desconectado)");
		} else if (isElectricConnected) {
			console.log("✅ [useMessages] Electric SQL conectado");
		}
	}, [isElectricConnected, isElectricLoading]);

	// Local SQLite state
	const [localMessages, setLocalMessages] = useState<Message[]>([]);

	// Fetch from Local SQLite (Offline Support)
	useEffect(() => {
		if (!chatId) return;

		let isMounted = true;
		const fetchLocal = async () => {
			try {
				const { getMessages: getLocalMessages } = require("@/core/database");
				const localData = await getLocalMessages(chatId, 50); // Fetch last 50 messages
				if (isMounted && localData.length > 0) {
					console.log(`📂 [useMessages] Carregado ${localData.length} mensagens do SQLite local`);
					setLocalMessages(localData);
				}
			} catch (err) {
				console.error("❌ Erro ao buscar mensagens locais:", err);
			}
		};

		fetchLocal();
		// Set up a poller or subscription if needed, for now just fetch on mount/chat change
		// We could also export an event emitter from database/index.ts to listen for inserts
	}, [chatId]);

	// Combine Local + Electric messages
	const allMessages = useMemo(() => {
		const combined = new Map<string, Message>();
		
		// Add local messages first
		localMessages.forEach(msg => combined.set(msg.id, msg));
		
		// Overlay Electric messages (source of truth for synced data)
		decryptedMessages.forEach(msg => combined.set(msg.id, msg));
		
		return Array.from(combined.values()).sort((a, b) => 
			new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
		);
	}, [localMessages, decryptedMessages]);

	// Determine if we should show the loading spinner
	// We only show it if: 
	// 1. The query is actually loading AND we have no local data yet 
	// 2. AND Electric isn't already in a failed/disconnected state (which should just show local data)
	const shouldShowLoading = useMemo(() => {
		if (allMessages.length > 0) return false;
		if (electricError || (!isElectricConnected && !isElectricLoading)) return false;
		return isLoading;
	}, [isLoading, allMessages.length, electricError, isElectricConnected, isElectricLoading]);

	return {
		messages: allMessages,
		isLoading: shouldShowLoading,
		isSyncing: isElectricLoading || isElectricConnected === false, // For optional "connecting..." sub-header
		error: combinedError,
		sendMessage: async (data: CreateMessageData) => {
			await sendMessage(data);
			// Trigger local refresh after send
			const { getMessages: getLocalMessages } = require("@/core/database");
			if (chatId) {
				const freshLocal = await getLocalMessages(chatId, 50);
				setLocalMessages(freshLocal);
			}
		},
		loadMoreMessages,
		hasMore: false,
		isLoadingMore: false,
		markAsViewed,
	};
}
