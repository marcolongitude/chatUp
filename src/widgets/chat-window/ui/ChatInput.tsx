import React from "react";
import { ActivityIndicator, TextInput as RNTextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "styled-components/native";
import { useTranslation } from "@/app/providers/i18n";
import { InputContainer, SendButton, ChatInputField } from "./styled";

interface ChatInputProps {
	value: string;
	onChangeText: (text: string) => void;
	onSend: () => void;
	isSending: boolean;
	inputRef: React.RefObject<RNTextInput | null>;
	bottomInset: number;
	keyboardHeight: number;
}

export const ChatInput = ({
	value,
	onChangeText,
	onSend,
	isSending,
	inputRef,
	bottomInset,
	keyboardHeight,
}: ChatInputProps) => {
	const theme = useTheme();
	const { t } = useTranslation();

	return (
		<InputContainer bottomInset={bottomInset} keyboardHeight={keyboardHeight}>
			<ChatInputField
				ref={inputRef}
				value={value}
				onChangeText={onChangeText}
				placeholder={t("chat.messagePlaceholder")}
				multiline
				maxLength={1000}
				editable={!isSending}
			/>
			<SendButton onPress={onSend} disabled={!value.trim() || isSending}>
				{isSending ? (
					<ActivityIndicator size="small" color={theme.colors.text.primary} />
				) : (
					<Ionicons name="send" size={20} color={theme.colors.text.primary} />
				)}
			</SendButton>
		</InputContainer>
	);
};
