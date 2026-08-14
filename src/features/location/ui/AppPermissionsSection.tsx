import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, AppState, type AppStateStatus } from "react-native";
import { useTheme } from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import styled from "styled-components/native";
import { useTranslation } from "react-i18next";

import {
	ensureLocationPermission,
	getLocationPermissionStatus,
	openAppSystemSettings,
} from "../lib/ensure-location-permission";
import {
	refreshSessionLocation,
	requestSessionLocationPermission,
} from "../model/location-session-actions";
import {
	getNotificationPermissionStatus,
	requestNotificationPermissions,
} from "@/shared/lib/notifications";

const Row = styled.View`
	margin-bottom: ${(props) => props.theme.spacing.md}px;
`;

const RowHeader = styled.View`
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	margin-bottom: ${(props) => props.theme.spacing.xs}px;
`;

const RowTitle = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.base}px;
	font-weight: ${(props) => props.theme.typography.fontWeight.semibold};
	color: ${(props) => props.theme.colors.text.primary};
`;

const StatusText = styled.Text<{ granted: boolean }>`
	font-size: ${(props) => props.theme.typography.fontSize.sm}px;
	color: ${(props) =>
		props.granted ? props.theme.colors.status.success : props.theme.colors.status.error};
`;

const Hint = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.sm}px;
	color: ${(props) => props.theme.colors.text.secondary};
	margin-bottom: ${(props) => props.theme.spacing.sm}px;
`;

const ActionButton = styled.TouchableOpacity<{ disabled?: boolean }>`
	flex-direction: row;
	align-items: center;
	justify-content: center;
	padding: ${(props) => props.theme.spacing.sm}px ${(props) => props.theme.spacing.md}px;
	border-radius: ${(props) => props.theme.borderRadius.md}px;
	background-color: ${(props) => props.theme.colors.button.primary};
	opacity: ${(props) => (props.disabled ? 0.6 : 1)};
`;

const ActionIconWrap = styled.View`
	margin-right: 8px;
`;

const SecondaryButton = styled.TouchableOpacity`
	flex-direction: row;
	align-items: center;
	justify-content: center;
	padding: ${(props) => props.theme.spacing.sm}px;
	margin-top: ${(props) => props.theme.spacing.xs}px;
`;

const ActionText = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.base}px;
	font-weight: ${(props) => props.theme.typography.fontWeight.semibold};
	color: ${(props) => props.theme.colors.text.primary};
`;

const SecondaryText = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.sm}px;
	color: ${(props) => props.theme.colors.button.primary};
`;

type PermissionState = {
	granted: boolean;
	canAskAgain: boolean;
	status: string;
};

export function AppPermissionsSection() {
	const theme = useTheme();
	const { t } = useTranslation();
	const [location, setLocation] = useState<PermissionState | null>(null);
	const [notifications, setNotifications] = useState<PermissionState | null>(null);
	const [busy, setBusy] = useState<"location" | "notifications" | null>(null);

	const refresh = useCallback(async () => {
		const [loc, notif] = await Promise.all([
			getLocationPermissionStatus(),
			getNotificationPermissionStatus(),
		]);
		setLocation(loc);
		setNotifications(notif);
	}, []);

	useEffect(() => {
		void refresh();
		const onAppState = (next: AppStateStatus) => {
			if (next === "active") void refresh();
		};
		const sub = AppState.addEventListener("change", onAppState);
		return () => sub.remove();
	}, [refresh]);

	const handleLocation = useCallback(async () => {
		setBusy("location");
		try {
			const current = await getLocationPermissionStatus();
			if (current.granted) {
				await refreshSessionLocation();
				await refresh();
				return;
			}
			if (current.canAskAgain || current.status === "undetermined") {
				const granted = await requestSessionLocationPermission();
				if (!granted) {
					const fallback = await ensureLocationPermission();
					if (!fallback.granted) await openAppSystemSettings();
				} else {
					await refreshSessionLocation();
				}
			} else {
				await openAppSystemSettings();
			}
			await refresh();
		} finally {
			setBusy(null);
		}
	}, [refresh]);

	const handleNotifications = useCallback(async () => {
		setBusy("notifications");
		try {
			const current = await getNotificationPermissionStatus();
			if (current.granted) {
				await refresh();
				return;
			}
			if (current.canAskAgain || current.status === "undetermined") {
				const granted = await requestNotificationPermissions();
				if (!granted) await openAppSystemSettings();
			} else {
				await openAppSystemSettings();
			}
			await refresh();
		} finally {
			setBusy(null);
		}
	}, [refresh]);

	return (
		<>
			<Row>
				<RowHeader>
					<RowTitle>{t("settings.permissionLocation")}</RowTitle>
					{location ? (
						<StatusText granted={location.granted}>
							{location.granted
								? t("settings.permissionGranted")
								: t("settings.permissionDenied")}
						</StatusText>
					) : (
						<ActivityIndicator size="small" color={theme.colors.button.primary} />
					)}
				</RowHeader>
				<Hint>{t("settings.permissionLocationHint")}</Hint>
				<ActionButton
					onPress={handleLocation}
					disabled={busy === "location"}
					activeOpacity={0.7}
				>
					<ActionIconWrap>
						{busy === "location" ? (
							<ActivityIndicator size="small" color={theme.colors.text.primary} />
						) : (
							<Ionicons name="location-outline" size={18} color={theme.colors.text.primary} />
						)}
					</ActionIconWrap>
					<ActionText>
						{location?.granted
							? t("settings.permissionRefreshLocation")
							: t("settings.permissionEnableLocation")}
					</ActionText>
				</ActionButton>
			</Row>

			<Row>
				<RowHeader>
					<RowTitle>{t("settings.permissionNotifications")}</RowTitle>
					{notifications ? (
						<StatusText granted={notifications.granted}>
							{notifications.granted
								? t("settings.permissionGranted")
								: t("settings.permissionDenied")}
						</StatusText>
					) : (
						<ActivityIndicator size="small" color={theme.colors.button.primary} />
					)}
				</RowHeader>
				<Hint>{t("settings.permissionNotificationsHint")}</Hint>
				<ActionButton
					onPress={handleNotifications}
					disabled={busy === "notifications"}
					activeOpacity={0.7}
				>
					<ActionIconWrap>
						{busy === "notifications" ? (
							<ActivityIndicator size="small" color={theme.colors.text.primary} />
						) : (
							<Ionicons
								name="notifications-outline"
								size={18}
								color={theme.colors.text.primary}
							/>
						)}
					</ActionIconWrap>
					<ActionText>
						{notifications?.granted
							? t("settings.permissionRefreshNotifications")
							: t("settings.permissionEnableNotifications")}
					</ActionText>
				</ActionButton>
			</Row>

			<SecondaryButton onPress={() => void openAppSystemSettings()} activeOpacity={0.7}>
				<SecondaryText>{t("settings.permissionOpenSystemSettings")}</SecondaryText>
			</SecondaryButton>
		</>
	);
}
