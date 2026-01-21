import React from "react";
import { StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import styled from "styled-components/native";
import { LoginForm, useAuth, LoginCredentials } from "@/features/auth";

const Container = styled(SafeAreaView)`
	flex: 1;
	background-color: ${(props) => props.theme.colors.background.primary};
`;

/**
 * Página de Login
 * Camada: Pages (FSD)
 */
export default function LoginPage() {
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
			if (hasCompleteProfile) router.replace("/(tabs)");
			else router.replace("/(auth)/create-profile");
		}
	}, [isAuthenticated, hasCompleteProfile, isPending]);

	return (
		<Container>
			<StatusBar barStyle="dark-content" />
			<LoginForm
				onSubmit={loginAction}
				onForgotPassword={() => {}}
				onSignUp={() => router.push("/(auth)/signup")}
				onGoogleSignIn={signInWithGoogle}
				onFacebookSignIn={() => {}}
				isLoading={isPending}
				error={error}
			/>
		</Container>
	);
}
