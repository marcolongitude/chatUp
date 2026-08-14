import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Outlet, useLocation, useRouter } from "@tanstack/react-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "styled-components/native";
import { useTranslation } from "@/app/providers/i18n";
import { Header } from "@/app/navigation/components/Header";
import { HeaderRightSlotProvider } from "@/app/contexts/HeaderRightSlotContext";

const TAB_BAR_HEIGHT = 60;

const fallbackColors = {
	tabBarBg: "#1a2a35",
	tabBarBorder: "#1e2d38",
	active: "#5b9bd5",
	inactive: "#8a9ba8",
};

export function BottomTabLayout() {
	const theme = useTheme();
	const insets = useSafeAreaInsets();
	const { t: translate } = useTranslation();
	const location = useLocation();
	const router = useRouter();

	const tabs = [
		{ name: "conversations", path: "/main/conversations", icon: "chatbubbles" as const },
		{ name: "profile", path: "/main/profile", icon: "person" as const },
		{ name: "settings", path: "/main/settings", icon: "settings" as const },
		{ name: "logout", path: "/main/logout", icon: "log-out" as const },
	] as const;

	const tabBarBg = theme.colors?.background?.secondary ?? fallbackColors.tabBarBg;
	const tabBarBorder = theme.colors?.border?.secondary ?? fallbackColors.tabBarBorder;

	const isChat = location.pathname.startsWith("/chat");
	const showBottomBar = !isChat;

	const normalizedPath = location.pathname.replace(/\/$/, "") || "/";

	return (
		<HeaderRightSlotProvider>
			<View style={styles.container}>
				<Header />
				<View style={styles.content}>
					<Outlet />
				</View>
				{showBottomBar && (
					<View
						style={[
							styles.tabBar,
							{
								backgroundColor: tabBarBg,
								borderTopColor: tabBarBorder,
								paddingBottom: Math.max(insets.bottom, 5),
							},
						]}
					>
						{tabs.map((tab) => {
							const isActive = normalizedPath === tab.path || normalizedPath.startsWith(tab.path + "/");
							const color = isActive
								? (theme.colors?.button?.primary ?? fallbackColors.active)
								: (theme.colors?.text?.tertiary ?? fallbackColors.inactive);

							return (
								<TouchableOpacity
									key={tab.name}
									testID={`e2e.tab.${tab.name}`}
									onPress={() => {
										void router.navigate({ to: tab.path });
									}}
									style={styles.tabItem}
									activeOpacity={0.7}
									accessibilityRole="button"
									accessibilityLabel={translate(`navigation.${tab.name}`)}
								>
									<Ionicons name={tab.icon} size={24} color={color} />
									<Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
										{translate(`navigation.${tab.name}`)}
									</Text>
								</TouchableOpacity>
							);
						})}
					</View>
				)}
			</View>
		</HeaderRightSlotProvider>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		flex: 1,
	},
	tabBar: {
		flexDirection: "row",
		minHeight: TAB_BAR_HEIGHT,
		borderTopWidth: 1,
		paddingTop: 5,
		paddingHorizontal: 10,
		alignItems: "center",
		justifyContent: "space-around",
	},
	tabItem: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		minHeight: 44,
	},
	tabLabel: {
		fontSize: 11,
		marginTop: 2,
	},
});
