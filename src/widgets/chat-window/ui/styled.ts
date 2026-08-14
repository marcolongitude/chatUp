import styled from "styled-components/native";
import { Platform } from "react-native";
import { TouchableOpacity } from "react-native";

// --- Styled Components ---
export const ContainerWrapper = styled.View`
    flex: 1;
    background-color: ${(props) => props.theme.colors.background.primary};
`;

export const MessagesListContainer = styled.View`
    flex: 1;
    padding: ${(props) => props.theme.spacing.md}px;
`;

export const MessageBubble = styled.View.attrs<{ isOwn: boolean; testID?: string }>((props) => ({
    testID: props.testID,
    accessibilityLabel: props.testID,
}))<{ isOwn: boolean; testID?: string }>`
    max-width: 75%;
    padding: ${(props) => props.theme.spacing.sm}px ${(props) => props.theme.spacing.md}px;
    margin-bottom: ${(props) => props.theme.spacing.sm}px;
    border-radius: ${(props) => props.theme.borderRadius.md}px;
    align-self: ${(props) => (props.isOwn ? "flex-end" : "flex-start")};
    background-color: ${(props) =>
        props.isOwn ? props.theme.colors.button.primary : props.theme.colors.background.card};
    overflow: visible;
`;

export const MessageText = styled.Text.attrs(() => ({
    // Android often under-measures shrink-wrapped Text width and clips the last glyph.
    includeFontPadding: false,
}))<{ isOwn: boolean }>`
    font-size: 16px;
    color: ${(props) => (props.isOwn ? props.theme.colors.text.primary : props.theme.colors.text.primary)};
    line-height: 20px;
    padding-right: 4px;
`;

export const MessageFooter = styled.View<{ isOwn: boolean }>`
    flex-direction: row;
    align-items: center;
    justify-content: ${(props) => (props.isOwn ? "flex-end" : "flex-start")};
    margin-top: 4px;
    gap: 4px;
`;

export const MessageTime = styled.Text.attrs(() => ({
    includeFontPadding: false,
}))<{ isOwn: boolean }>`
    font-size: 11px;
    color: ${(props) => (props.isOwn ? "rgba(255,255,255,0.85)" : props.theme.colors.text.tertiary)};
    opacity: ${(props) => (props.isOwn ? 1 : 0.8)};
    padding-right: 2px;
`;

export const InputContainer = styled.View<{ bottomInset: number; keyboardHeight: number }>`
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

export const ChatInputField = styled.TextInput.attrs(() => ({
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

export const SendButton = styled(TouchableOpacity)<{ disabled: boolean }>`
    width: 44px;
    height: 44px;
    border-radius: 22px;
    background-color: ${(props) =>
        props.disabled ? props.theme.colors.button.disabled : props.theme.colors.button.primary};
    justify-content: center;
    align-items: center;
    opacity: ${(props) => (props.disabled ? 0.5 : 1)};
`;

export const EmptyContainer = styled.View`
    flex: 1;
    justify-content: center;
    align-items: center;
    padding: ${(props) => props.theme.spacing.xl}px;
`;

export const EmptyText = styled.Text`
    font-size: 16px;
    color: ${(props) => props.theme.colors.text.tertiary};
    text-align: center;
`;

export const LoadingContainer = styled.View`
    flex: 1;
    justify-content: center;
    align-items: center;
`;

export const LoadingText = styled.Text`
    margin-top: ${(props) => props.theme.spacing.md}px;
    font-size: 14px;
    color: ${(props) => props.theme.colors.text.secondary};
`;