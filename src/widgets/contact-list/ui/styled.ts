import styled from "styled-components/native";

// --- Styled Components ---
export const Container = styled.View`
	flex: 1;
	background-color: ${(props) => props.theme.colors.background.primary};
`;

export const SearchBarContainer = styled.View`
	flex-direction: row;
	align-items: center;
	background-color: ${(props) => props.theme.colors.background.secondary};
	margin: ${(props) => props.theme.spacing.md}px;
	padding: ${(props) => props.theme.spacing.sm}px ${(props) => props.theme.spacing.md}px;
	border-radius: ${(props) => props.theme.borderRadius.md}px;
	border-width: 1px;
	border-color: ${(props) => props.theme.colors.border.secondary};
`;

export const SearchInput = styled.TextInput`
	flex: 1;
	height: 40px;
	color: ${(props) => props.theme.colors.text.primary};
	font-size: 16px;
	margin-left: ${(props) => props.theme.spacing.sm}px;
`;

export const ContactItem = styled.TouchableOpacity`
	flex-direction: row;
	align-items: center;
	padding: ${(props) => props.theme.spacing.md}px ${(props) => props.theme.spacing.lg}px;
	border-bottom-width: 1px;
	border-bottom-color: ${(props) => props.theme.colors.border.secondary};
	background-color: ${(props) => props.theme.colors.background.secondary};
`;

export const AvatarContainer = styled.View`
	width: 56px;
	height: 56px;
	border-radius: 28px;
	background-color: ${(props) => props.theme.colors.button.primary};
	justify-content: center;
	align-items: center;
	margin-right: ${(props) => props.theme.spacing.md}px;
`;

export const AvatarText = styled.Text`
	font-size: 24px;
	font-weight: 600;
	color: ${(props) => props.theme.colors.text.primary};
`;

export const ContactInfo = styled.View`
	flex: 1;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
`;

export const ContactDetails = styled.View`
	flex: 1;
`;

export const ContactName = styled.Text`
	font-size: 16px;
	font-weight: 600;
	color: ${(props) => props.theme.colors.text.primary};
`;

export const UnreadBadge = styled.View`
	min-width: 24px;
	height: 24px;
	border-radius: 12px;
	background-color: ${(props) => props.theme.colors.status.info};
	justify-content: center;
	align-items: center;
	padding-horizontal: 8px;
	margin-left: ${(props) => props.theme.spacing.sm}px;
`;

export const UnreadCount = styled.Text`
	font-size: 12px;
	font-weight: 600;
	color: ${(props) => props.theme.colors.text.primary};
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

export const ErrorText = styled.Text`
	font-size: 16px;
	color: ${(props) => props.theme.colors.status.error};
	text-align: center;
	margin-bottom: ${(props) => props.theme.spacing.md}px;
`;

export const ErrorIcon = styled.View`
	margin-bottom: ${(props) => props.theme.spacing.lg}px;
`;

export const ErrorButtonContainer = styled.View`
	margin-top: ${(props) => props.theme.spacing.lg}px;
	width: 100%;
	max-width: 300px;
`;

export const LoadingContainer = styled.View`
	flex: 1;
	justify-content: center;
	align-items: center;
`;