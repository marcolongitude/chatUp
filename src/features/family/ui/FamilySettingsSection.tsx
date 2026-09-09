import React, { useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, Switch } from "react-native";
import styled from "styled-components/native";
import { useTheme } from "styled-components/native";
import { useRouter } from "@tanstack/react-router";
import { useTranslation } from "@/app/providers/i18n";
import { useAuthSession } from "@/features/auth";
import { axiosInstance } from "@/shared/api";
import { useFamilyLinks } from "../model/use-family-links";

const SectionDescription = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.sm}px;
	color: ${(props) => props.theme.colors.text.secondary};
	margin-bottom: ${(props) => props.theme.spacing.md}px;
`;

const SearchRow = styled.View`
	flex-direction: row;
	align-items: center;
	gap: 8px;
	margin-bottom: ${(props) => props.theme.spacing.md}px;
`;

const SearchInput = styled.TextInput`
	flex: 1;
	min-height: 44px;
	padding: ${(props) => props.theme.spacing.sm}px ${(props) => props.theme.spacing.md}px;
	border-radius: ${(props) => props.theme.borderRadius.md}px;
	border-width: 1px;
	border-color: ${(props) => props.theme.colors.border.secondary};
	background-color: ${(props) => props.theme.colors.background.input};
	color: ${(props) => props.theme.colors.text.primary};
`;

const ActionButton = styled.TouchableOpacity<{ disabled?: boolean }>`
	padding: ${(props) => props.theme.spacing.sm}px ${(props) => props.theme.spacing.md}px;
	border-radius: ${(props) => props.theme.borderRadius.md}px;
	background-color: ${(props) => props.theme.colors.button.primary};
	opacity: ${(props) => (props.disabled ? 0.5 : 1)};
`;

const ActionButtonText = styled.Text`
	color: ${(props) => props.theme.colors.text.primary};
	font-weight: 600;
`;

const LinkCard = styled.View`
	padding: ${(props) => props.theme.spacing.md}px;
	margin-bottom: ${(props) => props.theme.spacing.sm}px;
	border-radius: ${(props) => props.theme.borderRadius.md}px;
	border-width: 1px;
	border-color: ${(props) => props.theme.colors.border.secondary};
	background-color: ${(props) => props.theme.colors.background.secondary};
`;

const LinkName = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.base}px;
	font-weight: 600;
	color: ${(props) => props.theme.colors.text.primary};
	margin-bottom: 4px;
`;

const LinkMeta = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.sm}px;
	color: ${(props) => props.theme.colors.text.secondary};
	margin-bottom: ${(props) => props.theme.spacing.sm}px;
`;

const Row = styled.View`
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	margin-top: ${(props) => props.theme.spacing.xs}px;
`;

const RowLabel = styled.Text`
	flex: 1;
	padding-right: ${(props) => props.theme.spacing.sm}px;
	font-size: ${(props) => props.theme.typography.fontSize.sm}px;
	color: ${(props) => props.theme.colors.text.primary};
`;

const GhostButton = styled.TouchableOpacity`
	padding: ${(props) => props.theme.spacing.xs}px 0;
`;

const GhostButtonText = styled.Text`
	color: ${(props) => props.theme.colors.button.primary};
	font-weight: 600;
`;

const EmptyText = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.sm}px;
	color: ${(props) => props.theme.colors.text.secondary};
`;

const ModalBackdrop = styled.View`
	flex: 1;
	background-color: rgba(0, 0, 0, 0.55);
	justify-content: center;
	padding: ${(props) => props.theme.spacing.lg}px;
`;

const ModalCard = styled.View`
	background-color: ${(props) => props.theme.colors.background.card};
	border-radius: ${(props) => props.theme.borderRadius.lg}px;
	padding: ${(props) => props.theme.spacing.lg}px;
`;

const ModalTitle = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.lg}px;
	font-weight: 700;
	color: ${(props) => props.theme.colors.text.primary};
	margin-bottom: ${(props) => props.theme.spacing.sm}px;
`;

const ModalBody = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.sm}px;
	color: ${(props) => props.theme.colors.text.secondary};
	line-height: 20px;
	margin-bottom: ${(props) => props.theme.spacing.md}px;
`;

const ModalActions = styled.View`
	flex-direction: row;
	justify-content: flex-end;
	gap: 12px;
`;

interface SearchHit {
	id: string;
	displayName?: string;
	email: string;
}

type PendingMapToggle =
	| { kind: "share"; linkId: string; enabled: boolean }
	| { kind: "monitor"; linkId: string; enabled: boolean }
	| null;

export function FamilySettingsSection() {
	const theme = useTheme();
	const { t } = useTranslation();
	const router = useRouter();
	const { user } = useAuthSession();
	const {
		links,
		isLoading,
		isBusy,
		isFamilyChef,
		requestLink,
		acceptLink,
		revokeLink,
		setLocationShare,
		setMapShare,
		setMapMonitor,
	} = useFamilyLinks();
	const [query, setQuery] = useState("");
	const [isSearching, setIsSearching] = useState(false);
	const [pendingMapToggle, setPendingMapToggle] = useState<PendingMapToggle>(null);

	const handleInvite = async () => {
		const term = query.trim();
		if (!term) return;
		setIsSearching(true);
		try {
			const response = await axiosInstance.get<SearchHit[]>("/users/search", {
				params: { q: term },
			});
			const peer = response.data.find((item) => item.id !== user?.id);
			if (!peer) {
				Alert.alert(t("errors.generic"), t("family.peerNotFound"));
				return;
			}
			await requestLink(peer.id);
			setQuery("");
			Alert.alert(t("family.inviteSentTitle"), t("family.inviteSentMessage", { name: peer.displayName || peer.email }));
		} catch {
			Alert.alert(t("errors.generic"), t("family.inviteFailed"));
		} finally {
			setIsSearching(false);
		}
	};

	const confirmMapToggle = async () => {
		if (!pendingMapToggle) return;
		const pending = pendingMapToggle;
		setPendingMapToggle(null);
		try {
			if (pending.kind === "share") {
				await setMapShare(pending.linkId, pending.enabled);
			} else {
				await setMapMonitor(pending.linkId, pending.enabled);
			}
		} catch {
			Alert.alert(t("errors.generic"), t("family.mapConsentFailed"));
		}
	};

	if (isLoading) {
		return <ActivityIndicator color={theme.colors.button.primary} />;
	}

	return (
		<>
			<SectionDescription testID="e2e.family.section">{t("family.description")}</SectionDescription>
			{isFamilyChef ? (
				<ActionButton
					testID="e2e.family.openMap"
					onPress={() => void router.navigate({ to: "/main/family-map" })}
					style={{ marginBottom: 12, alignSelf: "flex-start" }}
				>
					<ActionButtonText>{t("family.openMap")}</ActionButtonText>
				</ActionButton>
			) : null}
			<SearchRow>
				<SearchInput
					testID="e2e.family.search"
					value={query}
					onChangeText={setQuery}
					placeholder={t("family.searchPlaceholder")}
					placeholderTextColor={theme.colors.text.secondary}
					autoCapitalize="none"
					autoCorrect={false}
				/>
				<ActionButton
					testID="e2e.family.invite"
					onPress={handleInvite}
					disabled={isBusy || isSearching || !query.trim()}
				>
					<ActionButtonText>{t("family.invite")}</ActionButtonText>
				</ActionButton>
			</SearchRow>

			{links.length === 0 ? (
				<EmptyText testID="e2e.family.empty">{t("family.empty")}</EmptyText>
			) : (
				links.map((link) => {
					const isIncomingPending = link.status === "pending" && link.requestedBy !== user?.id;
					const isOutgoingPending = link.status === "pending" && link.requestedBy === user?.id;
					const isChef = link.iAmChef === true;
					return (
						<LinkCard key={link.id} testID={`e2e.family.link.${link.peerId}`}>
							<LinkName>{link.peerName || t("profile.user")}</LinkName>
							<LinkMeta>
								{link.status === "accepted"
									? link.locationShareActive
										? t("family.statusAcceptedWithLocation")
										: t("family.statusAcceptedNoLocation")
									: isOutgoingPending
										? t("family.statusPendingOutgoing")
										: t("family.statusPendingIncoming")}
							</LinkMeta>

							{isIncomingPending ? (
								<Row>
									<GhostButton
										testID={`e2e.family.accept.${link.id}`}
										onPress={() => void acceptLink(link.id)}
										disabled={isBusy}
									>
										<GhostButtonText>{t("family.accept")}</GhostButtonText>
									</GhostButton>
									<GhostButton
										testID={`e2e.family.decline.${link.id}`}
										onPress={() => void revokeLink(link.id)}
										disabled={isBusy}
									>
										<GhostButtonText>{t("family.decline")}</GhostButtonText>
									</GhostButton>
								</Row>
							) : null}

							{link.status === "accepted" ? (
								<>
									<Row>
										<RowLabel>{t("family.shareMyLocation")}</RowLabel>
										<Switch
											testID={`e2e.family.locationShare.${link.id}`}
											value={link.myLocationShare}
											onValueChange={(enabled) => void setLocationShare(link.id, enabled)}
											disabled={isBusy}
										/>
									</Row>
									<LinkMeta>
										{link.peerLocationShare
											? t("family.peerSharesLocation")
											: t("family.peerDoesNotShareLocation")}
									</LinkMeta>

									{!isChef ? (
										<>
											<Row>
												<RowLabel>{t("family.mapShareToggle")}</RowLabel>
												<Switch
													testID={`e2e.family.mapShare.${link.id}`}
													value={link.myMapShare}
													onValueChange={(enabled) => {
														if (enabled) {
															setPendingMapToggle({ kind: "share", linkId: link.id, enabled });
															return;
														}
														void setMapShare(link.id, false);
													}}
													disabled={isBusy}
												/>
											</Row>
											<LinkMeta>{t("family.mapShareHint")}</LinkMeta>
										</>
									) : (
										<>
											<Row>
												<RowLabel>{t("family.mapMonitorToggle")}</RowLabel>
												<Switch
													testID={`e2e.family.mapMonitor.${link.id}`}
													value={link.myMapMonitor}
													onValueChange={(enabled) => {
														if (enabled) {
															setPendingMapToggle({ kind: "monitor", linkId: link.id, enabled });
															return;
														}
														void setMapMonitor(link.id, false);
													}}
													disabled={isBusy}
												/>
											</Row>
											<LinkMeta>
												{link.mapTrackingActive
													? t("family.mapTrackingActive")
													: t("family.mapTrackingInactive")}
											</LinkMeta>
										</>
									)}

									<GhostButton onPress={() => void revokeLink(link.id)} disabled={isBusy}>
										<GhostButtonText>{t("family.revoke")}</GhostButtonText>
									</GhostButton>
								</>
							) : null}

							{isOutgoingPending ? (
								<GhostButton onPress={() => void revokeLink(link.id)} disabled={isBusy}>
									<GhostButtonText>{t("family.cancelInvite")}</GhostButtonText>
								</GhostButton>
							) : null}
						</LinkCard>
					);
				})
			)}

			<Modal visible={pendingMapToggle != null} transparent animationType="fade">
				<ModalBackdrop>
					<ModalCard>
						<ModalTitle>{t("family.mapConsentTitle")}</ModalTitle>
						<ModalBody>{t("family.mapConsentBody")}</ModalBody>
						<ModalActions>
							<Pressable onPress={() => setPendingMapToggle(null)}>
								<GhostButtonText>{t("family.mapConsentCancel")}</GhostButtonText>
							</Pressable>
							<Pressable testID="e2e.family.mapConsentConfirm" onPress={() => void confirmMapToggle()}>
								<GhostButtonText>{t("family.mapConsentConfirm")}</GhostButtonText>
							</Pressable>
						</ModalActions>
					</ModalCard>
				</ModalBackdrop>
			</Modal>
		</>
	);
}
