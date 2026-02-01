import React, { useCallback } from "react";
import { ActivityIndicator, FlatList } from "react-native";
import { useTheme } from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/shared/ui";
import { useTranslation } from "@/app/providers/i18n";

import { useContactList } from "../model/useContactList";
import { ContactListItem } from "./ContactListItem";
import { SearchResultsList } from "./SearchResultsList";
import { 
	Container, 
	EmptyContainer, 
	EmptyText, 
	ErrorText, 
	ErrorIcon, 
	ErrorButtonContainer, 
	LoadingContainer, 
	SearchBarContainer, 
	SearchInput 
} from "./styled";

/**
 * Widget que exibe a lista de contatos próximos e permite busca
 */
export function ContactList() {
	const theme = useTheme();
	const { t } = useTranslation();
	
	const {
		contacts,
		isLoading,
		searchQuery,
		setSearchQuery,
		searchPromise,
		nearbyError,
		isLocationPermissionError,
		isSearchingMode,
		openSettings,
		handleContactPress,
	} = useContactList();

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
