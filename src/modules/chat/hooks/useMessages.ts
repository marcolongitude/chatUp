import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/modules/auth";
import { ensureSignalSession } from "@/core/security";
import { useLiveQuery, eq, or, and } from "@tanstack/react-db";
import { messagesCollection, insertEncryptedMessage, decryptMessageRow } from "@/core/collections";
import { useElectric } from "@/core/electric";
import { useQuery } from "@tanstack/react-query";
import { fetchMessages as fetchMessagesApi, sendMessageApi } from "@/services/api/chat.service";
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

	// Determine if we should use Electric SQL or API REST
	// Use Electric if connected and ready, otherwise fallback to API
	const useElectricMode = useMemo(() => {
		const shouldUse = isElectricConnected && !isElectricLoading && chatId && user && contactId;
		console.log('🔍 [useMessages] Electric mode:', {
			shouldUse,
			isElectricConnected,
			isElectricLoading,
			hasChatId: !!chatId,
			hasUser: !!user,
			hasContactId: !!contactId,
		});
		return shouldUse;
	}, [isElectricConnected, isElectricLoading, chatId, user, contactId]);

	// Electric SQL query - always call hook (can't be conditional)
	// But return empty query if Electric not ready to prevent errors
	console.log('🔍 [useMessages] Electric status:', {
		useElectricMode,
		isElectricConnected,
		isElectricLoading,
		hasUser: !!user,
		hasContactId: !!contactId,
		userId: user?.id,
		contactId,
	});

	const {
		data: electricMessageRows = [],
		isLoading: electricIsLoading,
		error: electricQueryError,
	} = useLiveQuery((q) => {
		// Always return a valid query - empty if Electric not ready
		if (!useElectricMode || !user?.id || !contactId) {
			console.log('⚠️ [useMessages] Returning empty query - Electric not ready or missing data');
			return q.from({ msg: messagesCollection }).where(() => false);
		}

		// Validate all values before building query
		console.log('⚡ [useMessages] Building Electric query with:', { userId: user.id, contactId });
		
		try {
			// Build query with validated values
			return q
				.from({ msg: messagesCollection })
				.where(({ msg }) => {
					// Filter messages between current user and contact
					return and(
						or(eq(msg.sender_id, user.id), eq(msg.receiver_id, user.id)),
						or(
							and(eq(msg.sender_id, user.id), eq(msg.receiver_id, contactId)),
							and(eq(msg.sender_id, contactId), eq(msg.receiver_id, user.id))
						)
					);
				})
				.orderBy(({ msg }) => msg.timestamp, "asc");
		} catch (err) {
			console.error('❌ [useMessages] Query building error:', err);
			return q.from({ msg: messagesCollection }).where(() => false);
		}
	});

	// API REST fallback - used when Electric is not available
	const {
		data: apiMessages = [],
		isLoading: apiIsLoading,
		error: apiError,
	} = useQuery({
		queryKey: ['messages', contactId, user?.id],
		queryFn: () => {
			if (!contactId || !user?.id) {
				return Promise.resolve([]);
			}
			console.log('🌐 [useMessages] Fetching messages from API');
			return fetchMessagesApi(contactId);
		},
		enabled: !useElectricMode && !!contactId && !!user?.id, // Only fetch if not using Electric
		staleTime: 1000 * 30, // 30 seconds
	});

	// Use Electric data if available, otherwise use API data
	const messageRows = useElectricMode ? electricMessageRows : (apiMessages || []);
	const isLoading = useElectricMode ? electricIsLoading : apiIsLoading;
	const queryError = useElectricMode ? (electricQueryError || null) : (apiError || null);

	// Log which mode is being used
	useEffect(() => {
		console.log('📊 [useMessages] Current mode:', {
			useElectricMode,
			messageCount: messageRows.length,
			isLoading,
			hasError: !!queryError,
		});
	}, [useElectricMode, messageRows.length, isLoading, queryError]);

	// Decrypt messages and transform to Message format
	useEffect(() => {
		if (!messageRows || !user || !chatId) {
			setDecryptedMessages([]);
			return;
		}

		(async () => {
			try {
				// Handle both Electric rows and API messages
				const decrypted = await Promise.all(
					messageRows.map(async (row: any) => {
						if (useElectricMode) {
							// Electric row format - use decryptMessageRow
							return await decryptMessageRow(row, user.id);
						} else {
							// API message format - transform and decrypt
							const senderId = row.sender_id || row.senderId;
							const receiverId = row.receiver_id || row.receiverId;
							const chatId = generateChatId(senderId, receiverId);
							
							const { decryptMessage } = await import('@/core/security');
							const decryptedText = await decryptMessage(
								row.content,
								chatId,
								user.id,
								senderId,
								receiverId
							);
							
							return {
								id: row.id,
								text: decryptedText,
								timestamp: row.timestamp instanceof Date 
									? row.timestamp 
									: new Date(row.timestamp),
								senderId,
								receiverId,
								read: row.is_read || row.isRead || false,
							};
						}
					})
				);

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
	}, [messageRows, user?.id, chatId, useElectricMode]);

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
				if (useElectricMode) {
					// Use Electric SQL - insert encrypted message
					console.log('⚡ [useMessages] Sending via Electric SQL');
					await insertEncryptedMessage({
						senderId: user.id,
						receiverId: messageData.receiverId,
						content: plaintext,
						timestamp: new Date(),
					});
				} else {
					// Fallback to API REST
					console.log('🌐 [useMessages] Sending via API REST');
					// Encrypt message before sending
					const chatId = generateChatId(user.id, messageData.receiverId);
					const encryptedContent = await (await import('@/core/security')).encryptMessage(
						plaintext,
						chatId,
						user.id,
						messageData.receiverId
					);
					await sendMessageApi(messageData.receiverId, encryptedContent);
				}
			} catch (error) {
				console.error("❌ [useMessages] Error sending message:", error);
				throw error;
			}
		},
		[user, useElectricMode]
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
	const combinedIsLoading = isLoading || isElectricLoading || !isElectricConnected;
	
	// Combine errors - prioritize Electric connection errors
	const combinedError = electricError 
		? `Electric SQL não conectado: ${electricError.message}` 
		: queryError 
			? String(queryError) 
			: null;

	// Log connection status for debugging
	useEffect(() => {
		if (!isElectricConnected && !isElectricLoading) {
			console.warn("⚠️ Electric SQL não está conectado. Mensagens não serão sincronizadas.");
		}
	}, [isElectricConnected, isElectricLoading]);

	return {
		messages: decryptedMessages,
		isLoading: combinedIsLoading,
		error: combinedError,
		sendMessage,
		loadMoreMessages,
		hasMore: false, // Electric handles this automatically
		isLoadingMore: false,
		markAsViewed,
	};
}
