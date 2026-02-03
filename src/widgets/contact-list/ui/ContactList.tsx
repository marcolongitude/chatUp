import React, { useCallback, useEffect } from "react";
import { ActivityIndicator, FlatList } from "react-native";
import { useTheme } from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/shared/ui";
import { useTranslation } from "@/app/providers/i18n";
import { useHeaderRightSlot } from "@/app/contexts/HeaderRightSlotContext";
import { HeaderSearchWidget } from "@/widgets/header-search";

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
} from "./styled";

/**
 * Widget que exibe a lista de contatos próximos e permite busca
 */
export function ContactList() {
	const theme = useTheme();
	const { t } = useTranslation();
	const { setContent } = useHeaderRightSlot();

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

	useEffect(() => {
		setContent(
			<HeaderSearchWidget
				onChangeText={setSearchQuery}
				placeholder={t("conversations.searchPlaceholder") || "Search users by name or email..."}
			/>
		);
		return () => setContent(null);
	}, [setContent, t]);

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
