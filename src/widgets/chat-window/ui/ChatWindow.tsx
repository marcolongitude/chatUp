import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	TextInput as RNTextInput,
	ActivityIndicator,
	Keyboard,
	FlatList,
	TouchableOpacity,
} from "react-native";
import styled, { useTheme } from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMessages, MessageStatus, Message, CreateMessageData } from "@/entities/message";
import { useAuth } from "@/features/auth";
import { useTranslation } from "@/app/providers/i18n";
import { setCurrentChatSenderId } from "@/shared/lib/notifications";

// --- Styled Components ---
const ContainerWrapper = styled.View`
	flex: 1;
	background-color: ${(props) => props.theme.colors.background.primary};
`;

const MessagesListContainer = styled.View`
	flex: 1;
	padding: ${(props) => props.theme.spacing.md}px;
`;

const MessageBubble = styled.View<{ isOwn: boolean }>`
	max-width: 75%;
	padding: ${(props) => props.theme.spacing.sm}px ${(props) => props.theme.spacing.md}px;
	margin-bottom: ${(props) => props.theme.spacing.sm}px;
	border-radius: ${(props) => props.theme.borderRadius.md}px;
	align-self: ${(props) => (props.isOwn ? "flex-end" : "flex-start")};
	background-color: ${(props) =>
		props.isOwn ? props.theme.colors.button.primary : props.theme.colors.background.card};
`;

const MessageText = styled.Text<{ isOwn: boolean }>`
	font-size: 16px;
	color: ${(props) => (props.isOwn ? props.theme.colors.text.primary : props.theme.colors.text.primary)};
	line-height: 20px;
`;

const MessageFooter = styled.View<{ isOwn: boolean }>`
	flex-direction: row;
	align-items: center;
	justify-content: ${(props) => (props.isOwn ? "flex-end" : "flex-start")};
	margin-top: 4px;
	gap: 4px;
`;

const MessageTime = styled.Text<{ isOwn: boolean }>`
	font-size: 11px;
	color: ${(props) => (props.isOwn ? props.theme.colors.text.secondary : props.theme.colors.text.tertiary)};
	opacity: 0.7;
`;

const InputContainer = styled.View<{ bottomInset: number; keyboardHeight: number }>`
	flex-direction: row;
	padding: ${(props) => props.theme.spacing.md}px;
	padding-bottom: ${(props) => Math.max(props.theme.spacing.md, props.bottomInset)}px;
	background-color: ${(props) => props.theme.colors.background.secondary};
	border-top-width: 1px;
	border-top-color: ${(props) => props.theme.colors.border.secondary};
	align-items: center;
	${(props) =>
		Platform.OS === "android" && props.keyboardHeight > 0
			? `
		position: absolute;
		bottom: ${props.keyboardHeight + 10}px;
		left: 0;
		right: 0;
	`
			: ""}
`;

const TextInput = styled.TextInput.attrs(() => ({
	placeholderTextColor: "#8a9ba8",
}))`
	flex: 1;
	background-color: ${(props) => props.theme.colors.background.input};
	border-radius: ${(props) => props.theme.borderRadius.md}px;
	padding: ${(props) => props.theme.spacing.sm}px ${(props) => props.theme.spacing.md}px;
	color: ${(props) => props.theme.colors.text.primary};
	font-size: 16px;
	max-height: 100px;
	margin-right: ${(props) => props.theme.spacing.sm}px;
`;

const SendButton = styled(TouchableOpacity)<{ disabled: boolean }>`
	width: 44px;
	height: 44px;
	border-radius: 22px;
	background-color: ${(props) =>
		props.disabled ? props.theme.colors.button.disabled : props.theme.colors.button.primary};
	justify-content: center;
	align-items: center;
	opacity: ${(props) => (props.disabled ? 0.5 : 1)};
`;

const EmptyContainer = styled.View`
	flex: 1;
	justify-content: center;
	align-items: center;
	padding: ${(props) => props.theme.spacing.xl}px;
`;

const EmptyText = styled.Text`
	font-size: 16px;
	color: ${(props) => props.theme.colors.text.tertiary};
	text-align: center;
`;

const LoadingContainer = styled.View`
	flex: 1;
	justify-content: center;
	align-items: center;
`;

const LoadingText = styled.Text`
	margin-top: ${(props) => props.theme.spacing.md}px;
	font-size: 14px;
	color: ${(props) => props.theme.colors.text.secondary};
`;

interface ChatWindowProps {
    contactId: string;
}

/**
 * Widget que representa a Janela de Chat
 */
export function ChatWindow({ contactId }: ChatWindowProps) {
	const theme = useTheme();
	const { t } = useTranslation();
	const { user } = useAuth();
	const insets = useSafeAreaInsets();

	const { messages, isLoading, error, sendMessage, markAsViewed } =
		useMessages(contactId);

	const [optimisticMessages, addOptimisticMessage] = React.useOptimistic(
		messages,
		(state, newMessage: Message) => [newMessage, ...state]
	);

	useEffect(() => {
		if (contactId) {
			setCurrentChatSenderId(contactId);
			setTimeout(() => markAsViewed(), 300);
            return () => setCurrentChatSenderId(null);
		}
	}, [contactId, markAsViewed]);

	const [messageText, setMessageText] = useState("");
	const [isSending, setIsSending] = useState(false);
	const [keyboardHeight, setKeyboardHeight] = useState(0);
	const listRef = useRef<FlatList<Message> | null>(null);
	const inputRef = useRef<RNTextInput>(null);

	const sortedMessages = useMemo(() => {
		if (!optimisticMessages || !Array.isArray(optimisticMessages)) return [];
		const unique = optimisticMessages.reduce((acc, msg) => {
			if (!acc.find((m) => m.id === msg.id)) acc.push(msg);
			return acc;
		}, [] as Message[]);
		return unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
	}, [optimisticMessages]);

	useEffect(() => {
		const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
		const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
		const sub1 = Keyboard.addListener(showEvent, (e) => {
			setKeyboardHeight(e.endCoordinates.height);
			setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
		});
		const sub2 = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
		return () => { sub1.remove(); sub2.remove(); };
	}, []);

	const formatTime = useCallback((date: Date) => {
		return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
	}, []);

	const renderMessage = useCallback(({ item: message }: { item: Message }) => {
		if (!message || !message.id || !message.text) return null;
		const isOwn = message.senderId === user?.id;
		return (
			<MessageBubble isOwn={isOwn}>
				<MessageText isOwn={isOwn}>{message.text}</MessageText>
				<MessageFooter isOwn={isOwn}>
					<MessageTime isOwn={isOwn}>{formatTime(new Date(message.timestamp))}</MessageTime>
					{isOwn && <MessageStatus isRead={message.read} isViewed={message.viewedAt !== null} />}
				</MessageFooter>
			</MessageBubble>
		);
	}, [user?.id, formatTime]);

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
			React.startTransition(() => { addOptimisticMessage(optimisticMsg); });
			setMessageText("");
			await sendMessage({ text: textToSend, receiverId: contactId });
			setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
		} catch (err: any) {
			console.error("Erro ao enviar mensagem:", err);
		} finally {
			setIsSending(false);
		}
	};

	const content = (
		<>
			<MessagesListContainer>
				{isLoading && sortedMessages.length === 0 ? (
					<LoadingContainer>
						<ActivityIndicator size="large" color={theme.colors.button.primary} />
						<LoadingText>{t("chat.loadingMessages")}</LoadingText>
					</LoadingContainer>
				) : (
					<FlatList
						ref={listRef}
						data={sortedMessages}
						renderItem={renderMessage}
						keyExtractor={(item) => item.id}
						onEndReachedThreshold={0.5}
						contentContainerStyle={{
							paddingTop: insets.top,
							paddingBottom: insets.bottom,
                            flexGrow: sortedMessages.length === 0 ? 1 : 0,
						}}
						keyboardShouldPersistTaps="handled"
						ListEmptyComponent={!isLoading ? (
							<EmptyContainer><EmptyText>{t("chat.noMessages")}</EmptyText></EmptyContainer>
						) : null}
						inverted
                        removeClippedSubviews={Platform.OS === 'android'}
					/>
				)}
			</MessagesListContainer>

			<InputContainer bottomInset={insets.bottom} keyboardHeight={Platform.OS === 'android' ? keyboardHeight : 0}>
				<TextInput
					ref={inputRef as any}
					value={messageText}
					onChangeText={setMessageText}
					placeholder={t("chat.messagePlaceholder")}
					multiline
					maxLength={1000}
					editable={!isSending}
				/>
				<SendButton onPress={handleSendMessage} disabled={!messageText.trim() || isSending}>
					{isSending ? (
						<ActivityIndicator size="small" color={theme.colors.text.primary} />
					) : (
						<Ionicons name="send" size={20} color={theme.colors.text.primary} />
					)}
				</SendButton>
			</InputContainer>
		</>
	);

	if (Platform.OS === "android") {
		return <ContainerWrapper>{content}</ContainerWrapper>;
	}

	return (
		<KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={insets.top + 60} style={{ flex: 1 }}>
			{content}
		</KeyboardAvoidingView>
	);
}
