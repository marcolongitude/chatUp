import React, { useCallback, useEffect, useMemo } from "react";
import { ActivityIndicator, SectionList } from "react-native";
import { useTheme } from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/shared/ui";
import { useTranslation } from "react-i18next";
import { useHeaderRightSlot } from "@/shared/lib/contexts";
import { HeaderSearchWidget } from "@/shared/ui/header-search";

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
	SectionHeader,
	RefreshHint,
} from "./styled";

type ListContact = {
	id: string;
	name: string;
	avatar?: string;
	unreadCount?: number;
	inGrace?: boolean;
};

/**
 * Widget que exibe a lista de contatos próximos e permite busca
 */
export function ContactList() {
	const theme = useTheme();
	const { t } = useTranslation();
	const { setContent } = useHeaderRightSlot();

	const {
		familyContacts,
		discoveryContacts,
		isEmpty,
		isLoading,
		isRefreshing,
		searchQuery,
		setSearchQuery,
		searchPromise,
		nearbyError,
		isLocationPermissionError,
		needsLocationPermission,
		isRequestingPermission,
		isSearchingMode,
		perimeterKm,
		handleEnableLocation,
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
	}, [setContent, t, setSearchQuery]);

	const sections = useMemo(() => {
		const next: { key: string; title: string; data: ListContact[] }[] = [];
		if (familyContacts.length > 0) {
			next.push({
				key: "family",
				title: t("conversations.sectionFamily"),
				data: familyContacts,
			});
		}
		if (discoveryContacts.length > 0) {
			next.push({
				key: "discovery",
				title: t("conversations.sectionNearby"),
				data: discoveryContacts,
			});
		}
		return next;
	}, [familyContacts, discoveryContacts, t]);

	const renderContact = useCallback(
		({ item }: { item: ListContact }) => (
			<ContactListItem
				contact={{
					id: item.id,
					name: item.name,
					avatar: item.avatar,
					unreadCount: item.unreadCount,
					subtitle: item.inGrace ? t("conversations.familyGraceHint") : undefined,
				}}
				onPress={() => handleContactPress(item.id, item.name, item.avatar)}
			/>
		),
		[handleContactPress, t]
	);

	const keyExtractor = useCallback((item: ListContact) => item.id, []);

	const renderSectionHeader = useCallback(
		({ section }: { section: { title: string } }) => <SectionHeader>{section.title}</SectionHeader>,
		[]
	);

	return (
		<Container testID="e2e.conversations.screen">
			{isSearchingMode && searchPromise ? (
				<React.Suspense
					fallback={
						<LoadingContainer>
							<ActivityIndicator size="small" color={theme.colors.button.primary} />
							<EmptyText style={{ marginTop: theme.spacing.sm }}>{t("conversations.searching")}</EmptyText>
						</LoadingContainer>
					}
				>
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
						<>
							{isRefreshing ? <RefreshHint>{t("conversations.refreshing")}</RefreshHint> : null}
							<SectionList
								sections={sections}
								renderItem={renderContact}
								keyExtractor={keyExtractor}
								renderSectionHeader={renderSectionHeader}
								stickySectionHeadersEnabled
								contentContainerStyle={isEmpty ? { flex: 1 } : undefined}
								ListEmptyComponent={
									<EmptyContainer>
										{isLocationPermissionError || nearbyError ? (
											<>
												{(isLocationPermissionError || needsLocationPermission) && (
													<ErrorIcon>
														<Ionicons
															name="location-outline"
															size={64}
															color={theme.colors.status.error}
														/>
													</ErrorIcon>
												)}
												<ErrorText>
													{nearbyError || t("conversations.locationPermissionError")}
												</ErrorText>
												<EmptyText>
													{isLocationPermissionError
														? t("conversations.locationPermissionError")
														: t("conversations.locationError")}
												</EmptyText>
												{isLocationPermissionError && (
													<ErrorButtonContainer>
														<Button
															title={
																isRequestingPermission
																	? t("conversations.requestingPermission")
																	: t("conversations.enableLocation")
															}
															onPress={handleEnableLocation}
															variant="primary"
															disabled={isRequestingPermission}
														/>
													</ErrorButtonContainer>
												)}
											</>
										) : (
											<>
												<EmptyText>{t("conversations.noUsersFound")}</EmptyText>
												<EmptyText style={{ marginTop: theme.spacing.sm, fontSize: 14 }}>
													{t("conversations.usersWithin2km", { km: perimeterKm })}
												</EmptyText>
											</>
										)}
									</EmptyContainer>
								}
							/>
						</>
					)}
				</>
			)}
		</Container>
	);
}
