import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import styled from "styled-components/native";
import { useTheme } from "styled-components/native";
import { Navigate } from "@tanstack/react-router";
import { useTranslation } from "@/app/providers/i18n";
import { useFamilyMapSession } from "@/features/family-map";
import { FamilyMapView } from "@/widgets/family-map";

const Container = styled.View`
	flex: 1;
	background-color: ${(props) => props.theme.colors.background.primary};
`;

const Centered = styled.View`
	flex: 1;
	align-items: center;
	justify-content: center;
	padding: ${(props) => props.theme.spacing.lg}px;
`;

const Message = styled.Text`
	text-align: center;
	color: ${(props) => props.theme.colors.text.secondary};
	font-size: ${(props) => props.theme.typography.fontSize.sm}px;
`;

export default function FamilyMapPage() {
	const theme = useTheme();
	const { t } = useTranslation();
	const { members, isLoading, forbidden, isError } = useFamilyMapSession();

	if (forbidden) {
		return <Navigate to="/main/settings" />;
	}

	if (isLoading) {
		return (
			<Centered>
				<ActivityIndicator color={theme.colors.button.primary} />
			</Centered>
		);
	}

	if (isError) {
		return (
			<Centered>
				<Message>{t("familyMap.loadError")}</Message>
			</Centered>
		);
	}

	return (
		<Container testID="e2e.familyMap.page">
			{members.length === 0 ? (
				<View style={{ padding: 16 }}>
					<Text style={{ color: theme.colors.text.secondary }}>{t("familyMap.empty")}</Text>
				</View>
			) : null}
			<FamilyMapView members={members} />
		</Container>
	);
}
