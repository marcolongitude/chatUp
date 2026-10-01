import React, { useEffect, useState } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { initI18n } from "./config";

interface I18nProviderProps {
	children: React.ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
	console.log("🔍 I18nProvider: Renderizando...");
	const [isReady, setIsReady] = useState(false);

	useEffect(() => {
		console.log("🔍 I18nProvider: Inicializando i18n...");
		const initialize = async () => {
			try {
				await initI18n();
				console.log("✅ I18nProvider: i18n inicializado com sucesso");
				setIsReady(true);
			} catch (error) {
				console.error("❌ I18nProvider: Erro ao inicializar i18n:", error);
				setIsReady(true); // Continuar mesmo com erro
			}
		};

		initialize();
	}, []);

	if (!isReady) {
		console.log("🔍 I18nProvider: Ainda carregando, mostrando loading...");
		return (
			<View style={styles.container}>
				<ActivityIndicator size="large" color="#007AFF" />
			</View>
		);
	}

	console.log("✅ I18nProvider: Pronto, renderizando children");
	// Sempre renderizar children, mesmo se houver erro
	return <>{children}</>;
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#ffffff",
	},
});

