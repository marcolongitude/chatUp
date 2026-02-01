import styled from "styled-components/native";
import { Image } from "expo-image";

// --- Styled Components ---
export const ProfileContainer = styled.ScrollView`
    flex: 1;
    background-color: ${(props) => props.theme.colors.background.primary};
`;

export const ProfileCenterContainer = styled.View`
    flex: 1;
    justify-content: center;
    align-items: center;
    min-height: 400px;
`;

export const ProfileCardContainer = styled.View`
    margin: ${(props) => props.theme.spacing.md}px;
`;

export const ProfileHeader = styled.View`
    align-items: center;
    margin-bottom: ${(props) => props.theme.spacing.lg}px;
`;

export const ProfileAvatarContainer = styled.View`
    width: 100px;
    height: 100px;
    border-radius: 50px;
    background-color: ${(props) => props.theme.colors.button.primary};
    justify-content: center;
    align-items: center;
    margin-bottom: ${(props) => props.theme.spacing.md}px;
    overflow: hidden;
`;

export const ProfileAvatarImage = styled(Image)`
    width: 100%;
    height: 100%;
`;

export const ProfileAvatarText = styled.Text`
    font-size: 40px;
    font-weight: bold;
    color: ${(props) => props.theme.colors.text.primary};
`;

export const ProfileName = styled.Text`
    font-size: 24px;
    font-weight: bold;
    color: ${(props) => props.theme.colors.text.primary};
    margin-bottom: 4px;
    text-align: center;
`;

export const ProfileEmail = styled.Text`
    font-size: 16px;
    color: ${(props) => props.theme.colors.text.secondary};
    text-align: center;
`;

export const ProfileSection = styled.View`
    margin-bottom: ${(props) => props.theme.spacing.lg}px;
    padding-bottom: ${(props) => props.theme.spacing.md}px;
    border-bottom-width: 1px;
    border-bottom-color: ${(props) => props.theme.colors.border.secondary};
`;

export const ProfileSectionTitle = styled.Text`
    font-size: 12px;
    font-weight: 600;
    color: ${(props) => props.theme.colors.text.tertiary};
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

export const ProfileSectionContent = styled.Text`
    font-size: 16px;
    color: ${(props) => props.theme.colors.text.primary};
    line-height: 24px;
`;

export const ProfileStatusBadge = styled.View`
    padding: 4px 12px;
    border-radius: 12px;
    background-color: ${(props) => props.theme.colors.status.success};
    margin-top: 8px;
    align-self: flex-start;
`;

export const ProfileStatusText = styled.Text`
    font-size: 12px;
    font-weight: 600;
    color: ${(props) => props.theme.colors.text.primary};
`;

export const ProfileErrorText = styled.Text`
    font-size: 16px;
    color: ${(props) => props.theme.colors.status.error};
    text-align: center;
`;