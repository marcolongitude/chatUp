import React, { useState, useEffect } from "react";
import { ActivityIndicator, TouchableOpacity, Text, Alert, ScrollView, View } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { Image } from "expo-image";
import { useAuth } from "@/features/auth";
import { Card } from "@/shared/ui";
import { useTranslation } from "@/app/providers/i18n";
import { clearAllLocalMessages } from "@/shared/lib/database/utils";

// --- Styled Components ---
const ProfileContainer = styled.ScrollView`
	flex: 1;
	background-color: ${(props) => props.theme.colors.background.primary};
`;

const ProfileCenterContainer = styled.View`
	flex: 1;
	justify-content: center;
	align-items: center;
	min-height: 400px;
`;

const ProfileCardContainer = styled.View`
	margin: ${(props) => props.theme.spacing.md}px;
`;

const ProfileHeader = styled.View`
	align-items: center;
	margin-bottom: ${(props) => props.theme.spacing.lg}px;
`;

const ProfileAvatarContainer = styled.View`
	width: 100px;
	height: 100px;
	border-radius: 50px;
	background-color: ${(props) => props.theme.colors.button.primary};
	justify-content: center;
	align-items: center;
	margin-bottom: ${(props) => props.theme.spacing.md}px;
	overflow: hidden;
`;

const ProfileAvatarImage = styled(Image)`
	width: 100%;
	height: 100%;
`;

const ProfileAvatarText = styled.Text`
	font-size: 40px;
	font-weight: bold;
	color: ${(props) => props.theme.colors.text.primary};
`;

const ProfileName = styled.Text`
	font-size: 24px;
	font-weight: bold;
	color: ${(props) => props.theme.colors.text.primary};
	margin-bottom: 4px;
	text-align: center;
`;

const ProfileEmail = styled.Text`
	font-size: 16px;
	color: ${(props) => props.theme.colors.text.secondary};
	text-align: center;
`;

const ProfileSection = styled.View`
	margin-bottom: ${(props) => props.theme.spacing.lg}px;
	padding-bottom: ${(props) => props.theme.spacing.md}px;
	border-bottom-width: 1px;
	border-bottom-color: ${(props) => props.theme.colors.border.secondary};
`;

const ProfileSectionTitle = styled.Text`
	font-size: 12px;
	font-weight: 600;
	color: ${(props) => props.theme.colors.text.tertiary};
	margin-bottom: 8px;
	text-transform: uppercase;
	letter-spacing: 0.5px;
`;

const ProfileSectionContent = styled.Text`
	font-size: 16px;
	color: ${(props) => props.theme.colors.text.primary};
	line-height: 24px;
`;

const ProfileStatusBadge = styled.View`
	padding: 4px 12px;
	border-radius: 12px;
	background-color: ${(props) => props.theme.colors.status.success};
	margin-top: 8px;
	align-self: flex-start;
`;

const ProfileStatusText = styled.Text`
	font-size: 12px;
	font-weight: 600;
	color: ${(props) => props.theme.colors.text.primary};
`;

const ProfileErrorText = styled.Text`
	font-size: 16px;
	color: ${(props) => props.theme.colors.status.error};
	text-align: center;
`;

// --- Utils ---
function timestampToDate(timestamp: any): Date | null {
	if (!timestamp) return null;
	if (timestamp instanceof Date) return timestamp;
	if (timestamp && typeof timestamp.toDate === "function") return timestamp.toDate();
	if (timestamp && typeof timestamp.seconds === "number") return new Date(timestamp.seconds * 1000);
	if (typeof timestamp === "string") return new Date(timestamp);
	return null;
}

function formatDate(date: Date | null, locale: string): string {
	if (!date) return "";
	return date.toLocaleDateString(locale === "pt-BR" ? "pt-BR" : locale === "es" ? "es-ES" : "en-US", {
		day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
	});
}

/**
 * Widget que exibe as informações do perfil do usuário
 */
export function ProfileInfo() {
	const { userProfile, user, isLoading, error, syncPhotoURL } = useAuth();
	const theme = useTheme();
	const { t, currentLanguage } = useTranslation();
	const [imageLoaded, setImageLoaded] = useState(false);

	const photoURL = user?.photoURL || userProfile?.photoURL;
	const displayName = userProfile?.displayName || user?.displayName || t("profile.user");
	const avatarInitial = displayName.charAt(0).toUpperCase();

	useEffect(() => {
		if (user && user.photoURL && (!userProfile || !userProfile.photoURL)) {
			syncPhotoURL();
		}
	}, [user?.photoURL, userProfile?.photoURL]);

	if (isLoading) {
		return <ProfileCenterContainer><ActivityIndicator size="large" color={theme.colors.button.primary} /></ProfileCenterContainer>;
	}

	if (error) {
		return <ProfileCenterContainer><ProfileErrorText>{t("profile.errorLoading")}: {error}</ProfileErrorText></ProfileCenterContainer>;
	}

	if (!userProfile) return null;

	const createdAt = timestampToDate(userProfile.createdAt);
	const updatedAt = timestampToDate(userProfile.updatedAt);

	return (
		<ProfileContainer>
			<ProfileCardContainer>
				<Card style={{ backgroundColor: theme.colors.background.card }}>
					<ProfileHeader>
						<ProfileAvatarContainer>
							{photoURL ? (
								<ProfileAvatarImage 
                                    source={{ uri: photoURL }} 
                                    contentFit="cover" 
                                    onLoad={() => setImageLoaded(true)}
                                    style={{ opacity: imageLoaded ? 1 : 0.5 }}
                                />
							) : (
								<ProfileAvatarText>{avatarInitial}</ProfileAvatarText>
							)}
						</ProfileAvatarContainer>
						<ProfileName>{displayName}</ProfileName>
						<ProfileEmail>{userProfile.email}</ProfileEmail>
						{userProfile.hasProfile && (
							<ProfileStatusBadge><ProfileStatusText>{t("profile.profileComplete")}</ProfileStatusText></ProfileStatusBadge>
						)}
					</ProfileHeader>

					<ProfileSection>
						<ProfileSectionTitle>{t("profile.userId")}</ProfileSectionTitle>
						<ProfileSectionContent>{userProfile.id}</ProfileSectionContent>
					</ProfileSection>

					<ProfileSection>
						<ProfileSectionTitle>{t("profile.email")}</ProfileSectionTitle>
						<ProfileSectionContent>{userProfile.email}</ProfileSectionContent>
					</ProfileSection>

					{userProfile.phoneNumber && (
						<ProfileSection>
							<ProfileSectionTitle>{t("profile.phoneNumber")}</ProfileSectionTitle>
							<ProfileSectionContent>{userProfile.phoneNumber}</ProfileSectionContent>
						</ProfileSection>
					)}

					{userProfile.bio && (
						<ProfileSection>
							<ProfileSectionTitle>{t("profile.bio")}</ProfileSectionTitle>
							<ProfileSectionContent>{userProfile.bio}</ProfileSectionContent>
						</ProfileSection>
					)}

					{createdAt && (
						<ProfileSection>
							<ProfileSectionTitle>{t("profile.memberSince")}</ProfileSectionTitle>
							<ProfileSectionContent>{formatDate(createdAt, currentLanguage)}</ProfileSectionContent>
						</ProfileSection>
					)}

					{__DEV__ && (
						<ProfileSection>
							<TouchableOpacity
								onPress={() => {
									Alert.alert("Limpar Mensagens Locais", "Tem certeza?", [
										{ text: "Cancelar", style: "cancel" },
										{ text: "Limpar", style: "destructive", onPress: clearAllLocalMessages },
									]);
								}}
								style={{ backgroundColor: theme.colors.status.error, padding: 12, borderRadius: 8, marginTop: 16, alignItems: "center" }}
							>
								<Text style={{ color: "#fff", fontWeight: "bold" }}>🗑️ Limpar Mensagens Locais (DEV)</Text>
							</TouchableOpacity>
						</ProfileSection>
					)}
				</Card>
			</ProfileCardContainer>
		</ProfileContainer>
	);
}
