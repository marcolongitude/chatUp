import React, { useEffect } from "react";
import { ActivityIndicator, View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/features/auth";

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#0f1a1f",
		padding: 24,
	},
	errorText: {
		color: "#ff6b6b",
		fontSize: 16,
		textAlign: "center",
		marginTop: 16,
		marginBottom: 16,
	},
	hintText: {
		color: "#b8c5d1",
		fontSize: 14,
		textAlign: "center",
		marginTop: 8,
	},
});

export default function IndexScreen() {
	console.log("🔍 IndexScreen: Componente renderizado");
	
	const router = useRouter();
	const { isAuthenticated, hasCompleteProfile, isLoading, error } = useAuth();

	useEffect(() => {
		console.log("🔍 IndexScreen: Inicializando...");
		console.log("🔍 IndexScreen: isLoading =", isLoading);
		console.log("🔍 IndexScreen: isAuthenticated =", isAuthenticated);
		console.log("🔍 IndexScreen: hasCompleteProfile =", hasCompleteProfile);
		console.log("🔍 IndexScreen: error =", error);
	}, []);

	useEffect(() => {
		console.log("🔍 IndexScreen: Estado mudou", {
			isLoading,
			isAuthenticated,
			hasCompleteProfile,
			error,
		});

		if (!isLoading) {
			try {
				// Se houver erro de configuração do Firebase, não redirecionar
				if (error && error.includes("Firebase não está configurado")) {
					console.error("❌ IndexScreen: Erro de configuração do Firebase. Não redirecionando.");
					return;
				}

				if (isAuthenticated) {
					if (hasCompleteProfile) {
						console.log("🔍 IndexScreen: Redirecionando para /(tabs)");
						router.replace("/(tabs)");
					} else {
						console.log("🔍 IndexScreen: Redirecionando para /(auth)/create-profile");
						router.replace("/(auth)/create-profile");
					}
				} else {
					console.log("🔍 IndexScreen: Redirecionando para /(auth)/login");
					router.replace("/(auth)/login");
				}
			} catch (err) {
				console.error("❌ IndexScreen: Erro ao navegar:", err);
			}
		}
	}, [isAuthenticated, hasCompleteProfile, isLoading, error, router]);

	// Se houver erro de configuração do Firebase, mostrar mensagem
	if (!isLoading && error && error.includes("Firebase não está configurado")) {
		return (
			<View style={styles.container}>
				<Text style={styles.errorText}>Erro de Configuração</Text>
				<Text style={styles.errorText}>{error}</Text>
				<Text style={styles.hintText}>
					Verifique se as variáveis de ambiente do Firebase estão configuradas corretamente.
				</Text>
			</View>
		);
	}

	console.log("🔍 IndexScreen: Renderizando loading...");
	return (
		<View style={styles.container}>
			<ActivityIndicator size="large" color="#5b9bd5" />
			{error && !error.includes("Firebase não está configurado") && (
				<Text style={[styles.errorText, { marginTop: 16 }]}>{error}</Text>
			)}
		</View>
	);
}
