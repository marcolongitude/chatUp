import React from "react";
import { ActivityIndicator } from "react-native";
import { useTheme } from "styled-components/native";
import { Card } from "@/shared/ui";
import { useProfileInfo } from "../model/useProfileInfo";
import { 
    ProfileContainer, 
    ProfileCenterContainer, 
    ProfileCardContainer, 
    ProfileHeader, 
    ProfileAvatarContainer, 
    ProfileAvatarImage, 
    ProfileAvatarText, 
    ProfileName, 
    ProfileEmail, 
    ProfileSection, 
    ProfileSectionTitle, 
    ProfileSectionContent, 
    ProfileStatusBadge, 
    ProfileStatusText, 
    ProfileErrorText 
} from "./styled";

/**
 * Widget que exibe as informações do perfil do usuário
 */
export function ProfileInfo() {
	const theme = useTheme();
	const {
		userProfile,
		isLoading,
		error,
		photoURL,
		displayName,
		avatarInitial,
		imageLoaded,
		setImageLoaded,
		formattedCreatedAt,
		formattedUpdatedAt,
        t
	} = useProfileInfo();

	if (isLoading) {
		return (
            <ProfileCenterContainer>
                <ActivityIndicator size="large" color={theme.colors.button.primary} />
            </ProfileCenterContainer>
        );
	}

	if (error) {
		return (
            <ProfileCenterContainer>
                <ProfileErrorText>{t("profile.errorLoading")}: {error}</ProfileErrorText>
            </ProfileCenterContainer>
        );
	}

	if (!userProfile) return null;

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
							<ProfileStatusBadge>
                                <ProfileStatusText>{t("profile.profileComplete")}</ProfileStatusText>
                            </ProfileStatusBadge>
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

					{userProfile.displayName && (
						<ProfileSection>
							<ProfileSectionTitle>{t("profile.displayName")}</ProfileSectionTitle>
							<ProfileSectionContent>{userProfile.displayName}</ProfileSectionContent>
						</ProfileSection>
					)}

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

					{formattedCreatedAt && (
						<ProfileSection>
							<ProfileSectionTitle>{t("profile.memberSince")}</ProfileSectionTitle>
							<ProfileSectionContent>{formattedCreatedAt}</ProfileSectionContent>
						</ProfileSection>
					)}

					{formattedUpdatedAt && (
						<ProfileSection>
							<ProfileSectionTitle>{t("profile.lastUpdate")}</ProfileSectionTitle>
							<ProfileSectionContent>{formattedUpdatedAt}</ProfileSectionContent>
						</ProfileSection>
					)}
				</Card>
			</ProfileCardContainer>
		</ProfileContainer>
	);
}
