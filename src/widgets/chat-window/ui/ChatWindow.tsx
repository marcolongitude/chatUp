import React, { useCallback } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	ActivityIndicator,
	FlatList,
} from "react-native";
import { useTheme } from "styled-components/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "@/app/providers/i18n";
import { Message } from "@/entities/message";

import { useChatWindow } from "../model/useChatWindow";
import { MessageItem } from "./MessageItem";
import { ChatInput } from "./ChatInput";
import {
	EmptyContainer,
	EmptyText,
	LoadingContainer,
	LoadingText,
	MessagesListContainer,
	ContainerWrapper,
} from "./styled";

interface ChatWindowProps {
	contactId: string;
}

/**
 * Widget que representa a Janela de Chat
 */
export function ChatWindow({ contactId }: ChatWindowProps) {
	const theme = useTheme();
	const { t } = useTranslation();
	const insets = useSafeAreaInsets();

	const {
		user,
		messages,
		isLoading,
		messageText,
		setMessageText,
		isSending,
		keyboardHeight,
		listRef,
		inputRef,
		handleSendMessage,
	} = useChatWindow({ contactId });

	const renderMessage = useCallback(
		({ item }: { item: Message }) => (
			<MessageItem 
				message={item} 
				isOwn={item.senderId === user?.id} 
			/>
		),
		[user?.id]
	);

	const content = (
		<>
			<MessagesListContainer>
				{isLoading && messages.length === 0 ? (
					<LoadingContainer>
						<ActivityIndicator size="large" color={theme.colors.button.primary} />
						<LoadingText>{t("chat.loadingMessages")}</LoadingText>
					</LoadingContainer>
				) : (
					<FlatList
						ref={listRef}
						data={messages}
						renderItem={renderMessage}
						keyExtractor={(item) => item.id}
						onEndReachedThreshold={0.5}
						contentContainerStyle={{
							paddingTop: 8,
							paddingBottom: insets.bottom + 8,
							flexGrow: messages.length === 0 ? 1 : 0,
						}}
						keyboardShouldPersistTaps="handled"
						ListEmptyComponent={
							!isLoading ? (
								<EmptyContainer>
									<EmptyText>{t("chat.noMessages")}</EmptyText>
								</EmptyContainer>
							) : null
						}
						inverted
						removeClippedSubviews={Platform.OS === "android"}
					/>
				)}
			</MessagesListContainer>

			<ChatInput
				value={messageText}
				onChangeText={setMessageText}
				onSend={handleSendMessage}
				isSending={isSending}
				inputRef={inputRef}
				bottomInset={insets.bottom}
				keyboardHeight={Platform.OS === "android" ? keyboardHeight : 0}
			/>
		</>
	);

	if (Platform.OS === "android") {
		return <ContainerWrapper>{content}</ContainerWrapper>;
	}

	return (
		<KeyboardAvoidingView
			behavior="padding"
			keyboardVerticalOffset={insets.top + 60}
			style={{ flex: 1 }}
		>
			{content}
		</KeyboardAvoidingView>
	);
}
