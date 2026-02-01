import React, { useState, useRef, useEffect, useMemo } from "react";
import { Platform, Keyboard, FlatList, TextInput as RNTextInput } from "react-native";
import { useMessages, Message } from "@/entities/message";
import { useAuth } from "@/features/auth";
import { setCurrentChatSenderId } from "@/shared/lib/notifications";

interface UseChatWindowProps {
	contactId: string;
}

export function useChatWindow({ contactId }: UseChatWindowProps) {
	const { user } = useAuth();
	const { messages, isLoading, error, sendMessage, markAsViewed } = useMessages(contactId);

	const [optimisticMessages, addOptimisticMessage] = React.useOptimistic(
		messages,
		(state, newMessage: Message) => [newMessage, ...state]
	);

	const [messageText, setMessageText] = useState("");
	const [isSending, setIsSending] = useState(false);
	const [keyboardHeight, setKeyboardHeight] = useState(0);
	
	const listRef = useRef<FlatList<Message> | null>(null);
	const inputRef = useRef<RNTextInput | null>(null);

	// Notificações e Visualização
	useEffect(() => {
		if (contactId) {
			setCurrentChatSenderId(contactId);
			setTimeout(() => markAsViewed(), 300);
			return () => setCurrentChatSenderId(null);
		}
	}, [contactId, markAsViewed]);

	// Ordenação das mensagens
	const sortedMessages = useMemo(() => {
		if (!optimisticMessages || !Array.isArray(optimisticMessages)) return [];
		const unique = optimisticMessages.reduce((acc, msg) => {
			if (!acc.find((m) => m.id === msg.id)) acc.push(msg);
			return acc;
		}, [] as Message[]);
		return unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
	}, [optimisticMessages]);

	// Listeners de Teclado
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

	const handleSendMessage = async () => {
		if (!messageText.trim() || !contactId || isSending || !user) return;
		
		const textToSend = messageText.trim();
		setIsSending(true);
		
		try {
			const optimisticMsg: Message = {
				id: `temp_${Date.now()}`,
				chatId: `${user.id}_${contactId}`,
				senderId: user.id,
				receiverId: contactId,
				text: textToSend,
				timestamp: new Date(),
				read: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			};
			
			React.startTransition(() => {
				addOptimisticMessage(optimisticMsg);
			});
			
			setMessageText("");
			await sendMessage({ text: textToSend, receiverId: contactId });
			
			setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
		} catch (err: any) {
			console.error("Erro ao enviar mensagem:", err);
		} finally {
			setIsSending(false);
		}
	};

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
