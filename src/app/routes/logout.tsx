import React, { useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { useRouter } from '@tanstack/react-router';
import { useAuth } from '@/features/auth';
import { useTranslation } from '@/app/providers/i18n';

const Container = styled.View`
	flex: 1;
	justify-content: center;
	align-items: center;
	background-color: ${(props) => props.theme.colors.background.primary};
`;

const LoadingText = styled.Text`
	margin-top: ${(props) => props.theme.spacing.md}px;
	font-size: 16px;
	color: ${(props) => props.theme.colors.text.secondary};
`;

export function LogoutPage() {
	const router = useRouter();
	const { logout } = useAuth();
	const theme = useTheme();
	const { t } = useTranslation();

	useEffect(() => {
		const performLogout = async () => {
			try {
				await logout();
				router.navigate({ to: '/auth/login' });
			} catch (error) {
				console.error('Logout error:', error);
				router.navigate({ to: '/auth/login' });
			}
		};

		performLogout();
	}, [logout, router]);

	return (
		<Container>
			<ActivityIndicator size="large" color={theme.colors.button.primary} />
			<LoadingText>{t("auth.loggingOut")}</LoadingText>
		</Container>
	);
}
