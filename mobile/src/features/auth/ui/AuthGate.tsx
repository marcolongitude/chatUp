import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "@tanstack/react-router";
import styled, { useTheme } from "styled-components/native";

import { useAuthSession } from "../model/use-auth-session";

const Container = styled.View`
	flex: 1;
	align-items: center;
	justify-content: center;
	background-color: ${(props) => props.theme.colors.background.primary};
`;

interface AuthGateProps {
	children?: React.ReactNode;
	/** When true, unauthenticated users are sent to login. */
	requireAuth?: boolean;
	/** When true, authenticated users are sent to main (login/signup screens). */
	rejectAuth?: boolean;
}

function BootSpinner() {
	const theme = useTheme();
	return (
		<Container>
			<ActivityIndicator size="large" color={theme.colors.button.primary} />
		</Container>
	);
}

/**
 * Blocks render until session restore finishes, then redirects as needed.
 */
export function AuthGate({ children, requireAuth = false, rejectAuth = false }: AuthGateProps) {
	const router = useRouter();
	const { isAuthenticated, isLoading } = useAuthSession();

	useEffect(() => {
		if (isLoading) return;

		if (requireAuth && !isAuthenticated) {
			router.navigate({ to: "/auth/login", replace: true });
			return;
		}

		if (rejectAuth && isAuthenticated) {
			router.navigate({ to: "/main/conversations", replace: true });
		}
	}, [isLoading, isAuthenticated, requireAuth, rejectAuth, router]);

	if (isLoading) {
		return <BootSpinner />;
	}

	if (requireAuth && !isAuthenticated) {
		return <BootSpinner />;
	}

	if (rejectAuth && isAuthenticated) {
		return <BootSpinner />;
	}

	if (children == null) {
		return <BootSpinner />;
	}

	return <View style={{ flex: 1 }}>{children}</View>;
}
