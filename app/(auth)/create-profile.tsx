import React from "react";
import { StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import styled from "styled-components/native";
import { CreateProfileForm, useAuth, CreateProfileData } from "@/features/auth";

const Container = styled(SafeAreaView)`
	flex: 1;
	background-color: ${(props) => props.theme.colors.background.primary};
`;

/**
 * Página de Criação de Perfil Inicial
 * Camada: Pages (FSD)
 */
export default function CreateProfilePage() {
	const router = useRouter();
	const { createProfile, isAuthenticated, hasCompleteProfile } = useAuth();

	const [error, createProfileAction, isPending] = React.useActionState(
		async (prevState: string | null, data: CreateProfileData) => {
			try {
				await createProfile(data);
				return null;
			} catch (err: any) {
				return err.message || "Erro ao criar perfil";
			}
		},
		null
	);

	React.useEffect(() => {
		if (isAuthenticated && hasCompleteProfile && !isPending) {
			router.replace("/(tabs)");
		}
	}, [isAuthenticated, hasCompleteProfile, isPending]);

	return (
		<Container>
			<StatusBar barStyle="dark-content" />
			<CreateProfileForm
				onSubmit={createProfileAction}
				isLoading={isPending}
				error={error}
			/>
		</Container>
	);
}
