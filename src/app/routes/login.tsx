import React from "react";
import { StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import styled from "styled-components/native";
import { LoginForm, useAuth, LoginCredentials } from "@/features/auth";

const Container = styled(SafeAreaView)`
	flex: 1;
	background-color: ${(props) => props.theme.colors.background.primary};
`;

function resolveAuthError(error: string | null | undefined, t: (key: string) => string): string | null {
	if (!error) {
		return null;
	}
	if (error.startsWith("auth.") || error.startsWith("errors.")) {
		return t(error);
	}
	return error;
}

export function LoginPage() {
	const router = useRouter();
	const { t } = useTranslation();
	const {
		login,
		signInWithGoogle,
		isAuthenticated,
		hasCompleteProfile,
		isLoading: isAuthLoading,
		error: authError,
	} = useAuth();

	const [formError, loginAction, isPending] = React.useActionState(
		async (_prevState: string | null, credentials: LoginCredentials) => {
			try {
				await login(credentials.email, credentials.password);
				return null;
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : null;
				return message || t("auth.error");
			}
		},
		null
	);

	React.useEffect(() => {
		if (isAuthenticated && !isPending && !isAuthLoading) {
			if (hasCompleteProfile) router.navigate({ to: "/main/conversations" });
			else router.navigate({ to: "/auth/create-profile" });
		}
	}, [isAuthenticated, hasCompleteProfile, isPending, isAuthLoading, router]);

	const displayError = formError || resolveAuthError(authError, t);

	return (
		<Container>
			<StatusBar barStyle="dark-content" />
			<LoginForm
				onSubmit={loginAction}
				onForgotPassword={() => {}}
				onSignUp={() => router.navigate({ to: "/auth/signup" })}
				onGoogleSignIn={signInWithGoogle}
				onFacebookSignIn={() => {}}
				isLoading={isPending || isAuthLoading}
				error={displayError}
			/>
		</Container>
	);
}
