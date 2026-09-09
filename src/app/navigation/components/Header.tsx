import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "styled-components/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocation, useParams, useSearch } from "@tanstack/react-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "@/app/providers/i18n";
import { useHeaderRightSlot } from "@/app/contexts/HeaderRightSlotContext";
import { userApi } from "@/entities/user";

export function Header() {
	const theme = useTheme();
	const insets = useSafeAreaInsets();
	const { t: translate } = useTranslation();
	const router = useRouter();
	const location = useLocation();

	// No TanStack Router, podemos pegar params e search do contexto se estiverem disponíveis
	const search = useSearch({ strict: false }) as { initialName?: string; initialAvatar?: string };
	const params = useParams({ strict: false }) as { chatId?: string };

	const isChat = location.pathname.startsWith("/chat");
	const chatId = isChat ? params?.chatId : undefined;
	const needsContactProfile = isChat && !!chatId && (!search?.initialName || !search?.initialAvatar);

	const { data: contactProfile } = useQuery({
		queryKey: ["userProfile", chatId],
		queryFn: () => userApi.getUserById(chatId!),
		enabled: needsContactProfile,
		staleTime: 1000 * 60 * 5,
	});

	const contactName = search?.initialName || contactProfile?.displayName;
	const contactAvatar = search?.initialAvatar || contactProfile?.photoURL;

	// Logic to determine title and back button
	const getTitle = () => {
		if (isChat) return contactName || translate("navigation.chat");
		if (location.pathname === "/main/conversations") return translate("navigation.conversations");
		if (location.pathname === "/main/profile") return translate("navigation.profile");
		if (location.pathname === "/main/settings") return translate("navigation.settings");
		if (location.pathname === "/main/logout") return translate("navigation.logout");
		return "ChatUp";
	};

	const showBackButton = isChat || (location.pathname.startsWith("/auth") && location.pathname !== "/auth/login");

	const { content: headerRightContent } = useHeaderRightSlot();
	const isConversations = location.pathname === "/main/conversations";

	const headerContentTop = insets.top + 8;

	return (
		<View
			style={[
				styles.header,
				{
					backgroundColor: theme.colors.background.secondary,
					paddingTop: headerContentTop,
					height: insets.top + 64,
				},
			]}
			collapsable={false}
		>
			<View style={[styles.left, isChat ? styles.leftChat : isConversations ? styles.leftConversations : null]}>
				{showBackButton && (
					<TouchableOpacity onPress={() => router.history.back()} style={styles.backButton}>
						<Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
					</TouchableOpacity>
				)}
				{isChat ? (
					<Text
						style={[styles.title, styles.chatTitle, { color: theme.colors.text.primary }]}
						numberOfLines={1}
					>
						{getTitle()}
					</Text>
				) : isConversations ? (
					<Text
						style={[styles.title, styles.conversationsTitle, { color: theme.colors.text.primary }]}
						numberOfLines={1}
					>
						{getTitle()}
					</Text>
				) : null}
			</View>
			{!isChat && !isConversations ? (
				<View style={styles.center}>
					<View style={styles.titleContainer}>
						<Text style={[styles.title, { color: theme.colors.text.primary }]} numberOfLines={1}>
							{getTitle()}
						</Text>
					</View>
				</View>
			) : (
				<View style={styles.centerChat} />
			)}
			<View style={[styles.right, isChat ? styles.rightChat : null]}>
				{!isConversations && headerRightContent}
				{isChat && (
					<View style={styles.avatarContainer}>
						{contactAvatar ? (
							<Image
								source={{ uri: contactAvatar }}
								style={styles.avatar}
								contentFit="cover"
								cachePolicy="memory-disk"
							/>
						) : (
							<View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.button.primary }]}>
								<Text style={styles.avatarInitial}>{(contactName || "?").charAt(0).toUpperCase()}</Text>
							</View>
						)}
					</View>
				)}
			</View>
			{isConversations && headerRightContent ? (
				<View
					style={[StyleSheet.absoluteFill, { left: 0, right: 0, top: headerContentTop, bottom: 0 }]}
					pointerEvents="box-none"
				>
					<View style={styles.headerSlotFill}>
						<View style={styles.headerRightContentWrapper}>{headerRightContent}</View>
					</View>
				</View>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	header: {
		height: 64,
		paddingTop: 8,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 8,
		borderBottomWidth: 1,
		borderBottomColor: "rgba(0,0,0,0.1)",
	},
	left: {
		width: 44,
		justifyContent: "center",
		alignItems: "center",
	},
	leftChat: {
		flexDirection: "row",
		alignItems: "center",
		width: "auto",
		flexShrink: 1,
	},
	leftConversations: {
		flexDirection: "row",
		alignItems: "center",
		width: "auto",
		flexShrink: 1,
		justifyContent: "flex-start",
	},
	backButton: {
		padding: 8,
	},
	center: {
		flex: 1,
		paddingHorizontal: 8,
	},
	centerChat: {
		width: 0,
	},
	titleContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
	},
	avatarContainer: {
		marginLeft: 10,
	},
	avatar: {
		width: 32,
		height: 32,
		borderRadius: 16,
	},
	avatarPlaceholder: {
		width: 32,
		height: 32,
		borderRadius: 16,
		justifyContent: "center",
		alignItems: "center",
	},
	avatarInitial: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "bold",
	},
	right: {
		width: 44,
	},
	rightChat: {
		width: "auto",
		minWidth: 44,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "flex-end",
		paddingRight: 8,
	},
	headerSlotFill: {
		flex: 1,
	},
	headerRightContentWrapper: {
		flex: 1,
		paddingRight: 16,
		justifyContent: "center",
		alignItems: "flex-end",
	},
	title: {
		fontSize: 17,
		fontWeight: "600",
	},
	chatTitle: {
		marginLeft: 6,
		flexShrink: 1,
	},
	conversationsTitle: {
		marginLeft: 16,
		flexShrink: 1,
	},
});
