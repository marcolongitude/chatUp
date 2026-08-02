import React, { useState } from "react";
import { ActivityIndicator, Alert, Platform } from "react-native";
import { useTheme } from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import styled from "styled-components/native";
import { Card } from "@/shared/ui";
import { useTranslation } from "@/app/providers/i18n";
import { saveLanguage } from "@/app/providers/i18n";
import { PERIMETER_OPTIONS_KM, usePerimeter, type PerimeterKm } from "@/features/location";

const Container = styled.ScrollView`
	flex: 1;
	background-color: ${(props) => props.theme.colors.background.primary};
`;

const Header = styled.View`
	align-items: center;
	justify-content: center;
	padding: ${(props) => props.theme.spacing.xl}px ${(props) => props.theme.spacing.lg}px;
	padding-top: ${(props) => props.theme.spacing.xxl + 8}px;
	padding-bottom: ${(props) => props.theme.spacing.lg}px;
	margin-bottom: ${(props) => props.theme.spacing.lg}px;
`;

const Logo = styled(Image)`
	width: 200px;
	height: 66px;
`;

const Content = styled.View`
	padding: 0 ${(props) => props.theme.spacing.lg}px ${(props) => props.theme.spacing.lg}px;
`;

const Section = styled(Card)`
	margin-bottom: ${(props) => props.theme.spacing.lg}px;
	background-color: ${(props) => props.theme.colors.background.card};
`;

const SectionTitle = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.lg}px;
	font-weight: ${(props) => props.theme.typography.fontWeight.bold};
	color: ${(props) => props.theme.colors.text.primary};
	margin-bottom: ${(props) => props.theme.spacing.xs}px;
`;

const SectionDescription = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.sm}px;
	color: ${(props) => props.theme.colors.text.secondary};
	margin-bottom: ${(props) => props.theme.spacing.lg}px;
`;

const LanguageOption = styled.TouchableOpacity<{ isSelected: boolean }>`
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	padding: ${(props) => props.theme.spacing.md}px;
	margin-bottom: ${(props) => props.theme.spacing.xs}px;
	background-color: ${(props) => (props.isSelected ? props.theme.colors.background.input : "transparent")};
	border-radius: ${(props) => props.theme.borderRadius.md}px;
	border-width: 1px;
	border-color: ${(props) =>
		props.isSelected ? props.theme.colors.button.primary : props.theme.colors.border.secondary};
`;

const LanguageOptionText = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.base}px;
	color: ${(props) => props.theme.colors.text.primary};
`;

const VersionInfo = styled.View`
	padding: ${(props) => props.theme.spacing.xs}px;
`;

const VersionRow = styled.View`
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	margin-bottom: ${(props) => props.theme.spacing.xs}px;
`;

const VersionLabel = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.base}px;
	color: ${(props) => props.theme.colors.text.secondary};
`;

const VersionValue = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.base}px;
	color: ${(props) => props.theme.colors.text.primary};
	font-weight: ${(props) => props.theme.typography.fontWeight.semibold};
`;

const LoadingContainer = styled.View`
	flex: 1;
	justify-content: center;
	align-items: center;
	padding: ${(props) => props.theme.spacing.xl}px;
`;

interface LanguageOption {
	code: string;
	label: string;
}

export function SettingsPage() {
	const theme = useTheme();
	const { t: translate, currentLanguage } = useTranslation();
	const [isChangingLanguage, setIsChangingLanguage] = useState(false);
	const [isChangingPerimeter, setIsChangingPerimeter] = useState(false);
	const { perimeterKm, updatePerimeterKm } = usePerimeter();

	const languages: LanguageOption[] = [
		{ code: "pt-BR", label: translate("settings.portuguese") },
		{ code: "en", label: translate("settings.english") },
		{ code: "es", label: translate("settings.spanish") },
	];

	const handleLanguageChange = async (languageCode: string) => {
		if (languageCode === currentLanguage) return;

		setIsChangingLanguage(true);
		try {
			await saveLanguage(languageCode);
		} catch (error) {
			console.error("❌ Erro ao alterar idioma:", error);
			Alert.alert(translate("errors.generic"), translate("errors.generic"));
		} finally {
			setIsChangingLanguage(false);
		}
	};

	const handlePerimeterChange = async (km: PerimeterKm) => {
		if (km === perimeterKm) return;
		setIsChangingPerimeter(true);
		try {
			await updatePerimeterKm(km);
		} catch (error) {
			console.error("Erro ao alterar perímetro:", error);
			Alert.alert(translate("errors.generic"), translate("errors.generic"));
		} finally {
			setIsChangingPerimeter(false);
		}
	};

	const appVersion = Constants.expoConfig?.version || "1.0.0";
	const versionCode = Constants.expoConfig?.android?.versionCode || 1;
	const runtimeVersion =
		Updates.isEnabled && Updates.runtimeVersion ? Updates.runtimeVersion : __DEV__ ? "Development" : "N/A";
	const channel = Updates.isEnabled && Updates.channel ? Updates.channel : __DEV__ ? "Development" : "N/A";
	const isAndroid = Platform.OS === "android";
	const isDev = __DEV__;

	return (
		<Container>
			<Header>
				<Logo source={require("~/assets/logo-chatup.png")} contentFit="contain" cachePolicy="memory-disk" />
			</Header>
			<Content>
				<Section>
					<SectionTitle>{translate("settings.language")}</SectionTitle>
					<SectionDescription>{translate("settings.languageDescription")}</SectionDescription>
					{languages.map((lang) => (
						<LanguageOption
							key={lang.code}
							isSelected={currentLanguage === lang.code}
							onPress={() => handleLanguageChange(lang.code)}
							disabled={isChangingLanguage}
							activeOpacity={0.7}
						>
							<LanguageOptionText>{lang.label}</LanguageOptionText>
							{currentLanguage === lang.code && (
								<Ionicons name="checkmark-circle" size={24} color={theme.colors.button.primary} />
							)}
						</LanguageOption>
					))}
					{isChangingLanguage && (
						<LoadingContainer>
							<ActivityIndicator size="small" color={theme.colors.button.primary} />
						</LoadingContainer>
					)}
				</Section>

				<Section>
					<SectionTitle>{translate("settings.perimeter")}</SectionTitle>
					<SectionDescription>{translate("settings.perimeterDescription")}</SectionDescription>
					{PERIMETER_OPTIONS_KM.map((km) => (
						<LanguageOption
							key={km}
							isSelected={perimeterKm === km}
							onPress={() => handlePerimeterChange(km)}
							disabled={isChangingPerimeter}
							activeOpacity={0.7}
						>
							<LanguageOptionText>
								{translate("settings.perimeterKm", { km })}
							</LanguageOptionText>
							{perimeterKm === km && (
								<Ionicons name="checkmark-circle" size={24} color={theme.colors.button.primary} />
							)}
						</LanguageOption>
					))}
					{isChangingPerimeter && (
						<LoadingContainer>
							<ActivityIndicator size="small" color={theme.colors.button.primary} />
						</LoadingContainer>
					)}
				</Section>

				{isAndroid && (
					<Section>
						<SectionTitle>{translate("settings.appVersion")}</SectionTitle>
						<VersionInfo>
							<VersionRow>
								<VersionLabel>{translate("settings.appVersion")}</VersionLabel>
								<VersionValue>{appVersion}</VersionValue>
							</VersionRow>
							{isDev && (
								<>
									<VersionRow>
										<VersionLabel>{translate("settings.versionCode")}</VersionLabel>
										<VersionValue>{versionCode}</VersionValue>
									</VersionRow>
									<VersionRow>
										<VersionLabel>{translate("settings.runtimeVersion")}</VersionLabel>
										<VersionValue>{runtimeVersion}</VersionValue>
									</VersionRow>
									<VersionRow>
										<VersionLabel>{translate("settings.channel")}</VersionLabel>
										<VersionValue>{channel}</VersionValue>
									</VersionRow>
								</>
							)}
						</VersionInfo>
					</Section>
				)}
			</Content>
		</Container>
	);
}
