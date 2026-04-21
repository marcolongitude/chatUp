import React from "react";
import { StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "@tanstack/react-router";
import styled from "styled-components/native";
import { SignUpForm, useAuth, RegisterData } from "@/features/auth";

const Container = styled(SafeAreaView)`
	flex: 1;
	background-color: ${(props) => props.theme.colors.background.primary};
`;

export function SignUpPage() {
	const router = useRouter();
	const { signup, isAuthenticated, hasCompleteProfile } = useAuth();

	const [error, signupAction, isPending] = React.useActionState(
		async (prevState: string | null, data: RegisterData) => {
			try {
				await signup(data.email, data.password, data.name);
				return null;
			} catch (err: any) {
				return err.message || "Erro ao realizar cadastro";
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
			<SignUpForm
				onSubmit={signupAction}
				onSignIn={() => router.history.back()}
				isLoading={isPending}
				error={error}
			/>
		</Container>
	);
}
