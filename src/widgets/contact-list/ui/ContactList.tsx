import React, { useCallback, useState, useEffect } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/shared/ui";
import { useTranslation } from "@/app/providers/i18n";
import { useNearbyUsers } from "@/features/location";
import { useContacts } from "@/entities/contact";
import { useAuth } from "@/features/auth";
import { useRouter } from "expo-router";
import { ensureSignalSession } from "@/shared/lib/crypto";
import { axiosInstance } from "@/shared/api";
import { useLocation } from "@/features/location";

// --- Styled Components ---
const Container = styled.View`
	flex: 1;
	background-color: ${(props) => props.theme.colors.background.primary};
`;

const SearchBarContainer = styled.View`
	flex-direction: row;
	align-items: center;
	background-color: ${(props) => props.theme.colors.background.secondary};
	margin: ${(props) => props.theme.spacing.md}px;
	padding: ${(props) => props.theme.spacing.sm}px ${(props) => props.theme.spacing.md}px;
	border-radius: ${(props) => props.theme.borderRadius.md}px;
	border-width: 1px;
	border-color: ${(props) => props.theme.colors.border.secondary};
`;

const SearchInput = styled.TextInput`
	flex: 1;
	height: 40px;
	color: ${(props) => props.theme.colors.text.primary};
	font-size: 16px;
	margin-left: ${(props) => props.theme.spacing.sm}px;
`;

const ContactItem = styled.TouchableOpacity`
	flex-direction: row;
	align-items: center;
	padding: ${(props) => props.theme.spacing.md}px ${(props) => props.theme.spacing.lg}px;
	border-bottom-width: 1px;
	border-bottom-color: ${(props) => props.theme.colors.border.secondary};
	background-color: ${(props) => props.theme.colors.background.secondary};
`;

const AvatarContainer = styled.View`
	width: 56px;
	height: 56px;
	border-radius: 28px;
	background-color: ${(props) => props.theme.colors.button.primary};
	justify-content: center;
	align-items: center;
	margin-right: ${(props) => props.theme.spacing.md}px;
`;

const AvatarText = styled.Text`
	font-size: 24px;
	font-weight: 600;
	color: ${(props) => props.theme.colors.text.primary};
`;

const ContactInfo = styled.View`
	flex: 1;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
`;

const ContactDetails = styled.View`
	flex: 1;
`;

const ContactName = styled.Text`
	font-size: 16px;
	font-weight: 600;
	color: ${(props) => props.theme.colors.text.primary};
`;

const UnreadBadge = styled.View`
	min-width: 24px;
	height: 24px;
	border-radius: 12px;
	background-color: ${(props) => props.theme.colors.status.info};
	justify-content: center;
	align-items: center;
	padding-horizontal: 8px;
	margin-left: ${(props) => props.theme.spacing.sm}px;
`;

const UnreadCount = styled.Text`
	font-size: 12px;
	font-weight: 600;
	color: ${(props) => props.theme.colors.text.primary};
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

const ErrorText = styled.Text`
	font-size: 16px;
	color: ${(props) => props.theme.colors.status.error};
	text-align: center;
	margin-bottom: ${(props) => props.theme.spacing.md}px;
`;

const ErrorIcon = styled.View`
	margin-bottom: ${(props) => props.theme.spacing.lg}px;
`;

const ErrorButtonContainer = styled.View`
	margin-top: ${(props) => props.theme.spacing.lg}px;
	width: 100%;
	max-width: 300px;
`;

const LoadingContainer = styled.View`
	flex: 1;
	justify-content: center;
	align-items: center;
`;

// --- Sub-components ---
function ContactListItem({ contact, onPress }: { contact: any, onPress: () => void }) {
	const initials = contact.name
		? contact.name
				.split(" ")
				.map((n: string) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: "??";

	return (
		<ContactItem onPress={onPress} activeOpacity={0.7}>
			<AvatarContainer>
				<AvatarText>{initials}</AvatarText>
			</AvatarContainer>
			<ContactInfo>
				<ContactDetails>
					<ContactName>{contact.name}</ContactName>
				</ContactDetails>
				{contact.unreadCount && contact.unreadCount > 0 ? (
					<UnreadBadge>
						<UnreadCount>{contact.unreadCount > 99 ? "99+" : contact.unreadCount}</UnreadCount>
					</UnreadBadge>
				) : null}
			</ContactInfo>
		</ContactItem>
	);
}

function SearchResultsList({ 
	promise, 
	renderItem, 
	keyExtractor,
	t
}: { 
	promise: Promise<any[]>, 
	renderItem: any, 
	keyExtractor: any,
	t: any
}) {
	const results = React.use(promise);

	return (
		<FlatList
			data={results}
			renderItem={renderItem}
			keyExtractor={keyExtractor}
			contentContainerStyle={results.length === 0 ? { flex: 1 } : undefined}
			ListEmptyComponent={
				<EmptyContainer>
					<EmptyText>{t("conversations.noResultsFound") || "Nenhum usuário encontrado"}</EmptyText>
				</EmptyContainer>
			}
		/>
	);
}

/**
 * Widget que exibe a lista de contatos próximos e permite busca
 */
export function ContactList() {
	const theme = useTheme();
	const { t } = useTranslation();
	const router = useRouter();
	const { user } = useAuth();
    
    // Orchestration logic formerly in useConversations hook
    const { openSettings, permissionStatus } = useLocation();
	const { nearbyUsers, isLoading: isLoadingNearby, error: nearbyError } = useNearbyUsers();
	const { contacts, isLoading: isLoadingContacts } = useContacts(nearbyUsers);

	const [searchQuery, setSearchQuery] = useState("");
	const [searchPromise, setSearchPromise] = useState<Promise<any[]> | null>(null);

	const isLoading = isLoadingNearby || isLoadingContacts;
    const isLocationPermissionError = Boolean(
		nearbyError &&
			(nearbyError.includes("localização") ||
				nearbyError.includes("permissão") ||
				nearbyError.includes("Localização") ||
				!permissionStatus?.granted)
	);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (searchQuery.length >= 2) {
				const promise = axiosInstance.get(`/users/search`, {
					params: { q: searchQuery }
				}).then(res => res.data);
				setSearchPromise(promise);
			} else {
				setSearchPromise(null);
			}
		}, 500);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	const handleContactPress = useCallback((contactId: string, name?: string, avatar?: string) => {
		if (user) {
			ensureSignalSession(user.id, contactId).catch(() => {});
		}

		router.push({
			pathname: `/(tabs)/chat/${contactId}`,
			params: { contactId, initialName: name, initialAvatar: avatar }
		} as any);
	}, [user, router]);

	const renderContact = useCallback(
		({ item }: { item: any }) => (
			<ContactListItem 
				contact={{
					id: item.id,
					name: item.displayName || item.name,
					avatar: item.photoURL || item.avatar,
					unreadCount: item.unreadCount
				}} 
				onPress={() => handleContactPress(item.id, item.displayName || item.name, item.photoURL || item.avatar)} 
			/>
		),
		[handleContactPress]
	);

	const keyExtractor = useCallback((item: any) => item.id, []);
	const isSearchingMode = searchQuery.length >= 2;

	return (
		<Container>
			<SearchBarContainer>
				<Ionicons name="search" size={20} color={theme.colors.text.tertiary} />
				<SearchInput
					placeholder={t("conversations.searchPlaceholder") || "Buscar usuários..."}
					placeholderTextColor={theme.colors.text.tertiary}
					value={searchQuery}
					onChangeText={setSearchQuery}
					autoCapitalize="none"
				/>
				{searchQuery.length > 0 && (
					<Ionicons 
						name="close-circle" 
						size={20} 
						color={theme.colors.text.tertiary} 
						onPress={() => setSearchQuery("")}
					/>
				)}
			</SearchBarContainer>

			{isSearchingMode && searchPromise ? (
				<React.Suspense fallback={
					<LoadingContainer>
						<ActivityIndicator size="small" color={theme.colors.button.primary} />
						<EmptyText style={{ marginTop: theme.spacing.sm }}>{t("conversations.searching")}</EmptyText>
					</LoadingContainer>
				}>
					<SearchResultsList 
						promise={searchPromise} 
						renderItem={renderContact} 
						keyExtractor={keyExtractor}
						t={t}
					/>
				</React.Suspense>
			) : (
				<>
					{isLoading ? (
						<LoadingContainer>
							<ActivityIndicator size="large" color={theme.colors.button.primary} />
							<EmptyText style={{ marginTop: theme.spacing.md }}>{t("conversations.searching")}</EmptyText>
						</LoadingContainer>
					) : (
						<FlatList
							data={contacts}
							renderItem={renderContact}
							keyExtractor={keyExtractor}
							contentContainerStyle={contacts.length === 0 ? { flex: 1 } : undefined}
							ListEmptyComponent={
								<EmptyContainer>
									{nearbyError ? (
										<>
											{isLocationPermissionError && (
												<ErrorIcon>
													<Ionicons name="location-outline" size={64} color={theme.colors.status.error} />
												</ErrorIcon>
											)}
											<ErrorText>{nearbyError}</ErrorText>
											<EmptyText>
												{isLocationPermissionError
													? t("conversations.locationPermissionError")
													: t("conversations.locationError")}
											</EmptyText>
											{isLocationPermissionError && (
												<ErrorButtonContainer>
													<Button title={t("conversations.openSettings")} onPress={openSettings} variant="primary" />
												</ErrorButtonContainer>
											)}
										</>
									) : (
										<>
											<EmptyText>{t("conversations.noUsersFound")}</EmptyText>
											<EmptyText style={{ marginTop: theme.spacing.sm, fontSize: 14 }}>
												{t("conversations.usersWithin2km")}
											</EmptyText>
										</>
									)}
								</EmptyContainer>
							}
						/>
					)}
				</>
			)}
		</Container>
	);
}
