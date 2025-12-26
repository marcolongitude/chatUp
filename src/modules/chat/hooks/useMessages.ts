import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/modules/auth";
import { ensureSignalSession } from "@/core/security";
import { useLiveQuery, eq, or, and } from "@tanstack/react-db";
import { messagesCollection, insertEncryptedMessage, decryptMessageRow } from "@/core/collections";
import type { Message, CreateMessageData } from "../types";

// Helper to generate a consistent chat ID (users sorted alphabetically)
function generateChatId(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort();
  return `${sorted[0]}_${sorted[1]}`;
}

export function useMessages(contactId: string) {
  const { user } = useAuth();
  const [decryptedMessages, setDecryptedMessages] = useState<Message[]>([]);

  // Generate chat ID
  const chatId = useMemo(() => {
    if (!user || !contactId) return null;
    return generateChatId(user.id, contactId);
  }, [user?.id, contactId]);

  // Live query for messages - automatically updates when Electric syncs new messages
  const { data: messageRows, isLoading, error: queryError } = useLiveQuery((q) => {
    if (!chatId || !user) {
      return q.from({ msg: messagesCollection }).where(() => false); // Empty query
    }

    return q
      .from({ msg: messagesCollection })
      .where(({ msg }) =>
        and(
          or(eq(msg.sender_id, user.id), eq(msg.receiver_id, user.id)),
          // Filter by chat participants
          or(
            and(eq(msg.sender_id, user.id), eq(msg.receiver_id, contactId)),
            and(eq(msg.sender_id, contactId), eq(msg.receiver_id, user.id))
          )
        )
      )
      .orderBy(({ msg }) => msg.timestamp, "asc");
  });

  // Decrypt messages and transform to Message format
  useEffect(() => {
    if (!messageRows || !user || !chatId) {
      setDecryptedMessages([]);
      return;
    }

    (async () => {
      try {
        const decrypted = await Promise.all(
          messageRows.map((row) => decryptMessageRow(row, user.id))
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
        console.error("Error decrypting messages:", error);
        setDecryptedMessages([]);
      }
    })();
  }, [messageRows, user?.id, chatId]);

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
        // TanStack DB handles optimistic updates automatically
        await insertEncryptedMessage({
          senderId: user.id,
          receiverId: messageData.receiverId,
          content: plaintext,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error("Error sending message:", error);
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
        (msg) =>
          msg.receiver_id === user.id &&
          msg.sender_id === contactId &&
          !msg.is_read
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

  return {
    messages: decryptedMessages,
    isLoading,
    error: queryError ? String(queryError) : null,
    sendMessage,
    loadMoreMessages,
    hasMore: false, // Electric handles this automatically
    isLoadingMore: false,
    markAsViewed,
  };
}
