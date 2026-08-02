import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Platform, Keyboard, FlatList, TextInput as RNTextInput, Linking } from "react-native";
import { useMessages, type Message } from "@/entities/message";
import { useAuth } from "@/features/auth";
import { setCurrentChatSenderId } from "@/shared/lib/notifications";

interface UseChatWindowProps {
	contactId: string;
}

function parseE2eChatSendUrl(url: string): string | null {
	try {
		const normalized = url.replace(/^chatup:\/\//, "https://chatup/");
		const parsed = new URL(normalized);
		const path = `${parsed.hostname}${parsed.pathname}`.replace(/\/+$/, "");
		if (path !== "e2e/chat-send" && !path.endsWith("e2e/chat-send")) {
			return null;
		}
		const text = parsed.searchParams.get("text");
		return text && text.trim() ? text : null;
	} catch {
		return null;
	}
}

export function useChatWindow({ contactId }: UseChatWindowProps) {
	const { user } = useAuth();
	const { messages, isLoading, error, sendMessage, markAsViewed } = useMessages(contactId, user?.id);

	const [messageText, setMessageText] = useState("");
	const [isSending, setIsSending] = useState(false);
	const [keyboardHeight, setKeyboardHeight] = useState(0);

	const listRef = useRef<FlatList<Message> | null>(null);
	const inputRef = useRef<RNTextInput | null>(null);
	const sendMessageRef = useRef(sendMessage);
	const userRef = useRef(user);
	const isSendingRef = useRef(isSending);
	sendMessageRef.current = sendMessage;
	userRef.current = user;
	isSendingRef.current = isSending;

	useEffect(() => {
		if (contactId) {
			setCurrentChatSenderId(contactId);
			setTimeout(() => markAsViewed(), 300);
			return () => setCurrentChatSenderId(null);
		}
	}, [contactId, markAsViewed]);

	const sortedMessages = useMemo(() => {
		if (!messages || !Array.isArray(messages)) return [];
		// FlatList inverted: newest first
		return [...messages].sort((a, b) => {
			const aSeq = a.seqNum ?? 0;
			const bSeq = b.seqNum ?? 0;
			if (aSeq > 0 && bSeq > 0 && aSeq !== bSeq) return bSeq - aSeq;
			return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
		});
	}, [messages]);

	useEffect(() => {
		const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
		const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

		const sub1 = Keyboard.addListener(showEvent, (e) => {
			setKeyboardHeight(e.endCoordinates.height);
			setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
		});

		const sub2 = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));

		return () => {
			sub1.remove();
			sub2.remove();
		};
	}, []);

	const handleSendMessage = useCallback(async () => {
		if (!messageText.trim() || !contactId || isSending || !user) return;

		const textToSend = messageText.trim();
		setIsSending(true);

		try {
			setMessageText("");
			await sendMessage({ text: textToSend, receiverId: contactId });
			setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
		} catch (err: unknown) {
			console.error("Erro ao enviar mensagem:", err);
		} finally {
			setIsSending(false);
		}
	}, [messageText, contactId, isSending, user, sendMessage]);

	// Dual-device E2E harness: adb shell am start -a VIEW -d 'chatup://e2e/chat-send?text=...'
	useEffect(() => {
		if (!__DEV__ || !contactId) return;

		const sendFromE2e = async (text: string) => {
			if (!text.trim() || isSendingRef.current || !userRef.current) return;
			setIsSending(true);
			try {
				setMessageText("");
				await sendMessageRef.current({ text: text.trim(), receiverId: contactId });
				console.log("[E2E] chat-send ok", { contactId, len: text.trim().length });
			} catch (err: unknown) {
				console.error("[E2E] chat-send failed", err);
			} finally {
				setIsSending(false);
			}
		};

		const onUrl = ({ url }: { url: string }) => {
			const text = parseE2eChatSendUrl(url);
			if (text) {
				void sendFromE2e(text);
			}
		};

		const sub = Linking.addEventListener("url", onUrl);
		void Linking.getInitialURL().then((url) => {
			if (url) onUrl({ url });
		});
		return () => sub.remove();
	}, [contactId]);

	return {
		user,
		messages: sortedMessages,
		isLoading,
		error,
		messageText,
		setMessageText,
		isSending,
		keyboardHeight,
		listRef,
		inputRef,
		handleSendMessage,
	};
}
