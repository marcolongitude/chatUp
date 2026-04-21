import React from "react";
import { StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "@tanstack/react-router";
import styled from "styled-components/native";
import { LoginForm, useAuth, LoginCredentials } from "@/features/auth";

const Container = styled(SafeAreaView)`
	flex: 1;
	background-color: ${(props) => props.theme.colors.background.primary};
`;

export function LoginPage() {
	const router = useRouter();
	const { login, signInWithGoogle, isAuthenticated, hasCompleteProfile } = useAuth();

	const [error, loginAction, isPending] = React.useActionState(
		async (prevState: string | null, credentials: LoginCredentials) => {
			try {
				await login(credentials.email, credentials.password);
				return null;
			} catch (err: any) {
				return err.message || "Erro ao fazer login";
			}
		},
		null
	);

	React.useEffect(() => {
		if (isAuthenticated && !isPending) {
			if (hasCompleteProfile) router.navigate({ to: "/main/conversations" });
			else router.navigate({ to: "/auth/create-profile" });
		}
	}, [isAuthenticated, hasCompleteProfile, isPending, router]);

	return (
		<Container>
			<StatusBar barStyle="dark-content" />
			<LoginForm
				onSubmit={loginAction}
				onForgotPassword={() => {}}
				onSignUp={() => router.navigate({ to: "/auth/signup" })}
				onGoogleSignIn={signInWithGoogle}
				onFacebookSignIn={() => {}}
				isLoading={isPending}
				error={error}
			/>
		</Container>
	);
}
