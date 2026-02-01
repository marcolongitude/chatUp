// MUST BE THE VERY FIRST IMPORT
// Import polyfills - usar require para evitar que Expo Router trate como rota
require("@/app/config/polyfills/index");

import { Stack } from "expo-router";
import { Providers } from "@/app/providers";
import { UpdateDialog } from "@/shared/ui";
import React, { Suspense, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { requestNotificationPermissions } from "@/shared/lib/notifications";

// Polyfill global crypto - NÃO sobrescrever crypto se já foi configurado nos polyfills
import * as Crypto from "expo-crypto";

console.log('🔍 [_layout] Verificando estado do crypto após polyfills...');
console.log('🔍 [_layout] crypto existe:', !!(global as any).crypto);
console.log('🔍 [_layout] crypto.subtle existe:', !!(global as any).crypto?.subtle);

// Verificar se crypto já foi configurado pelos polyfills
const cryptoAlreadyConfigured = (global as any).crypto && (global as any).crypto.subtle;

if (!cryptoAlreadyConfigured) {
	console.warn('⚠️ [_layout] crypto.subtle não foi configurado pelos polyfills!');
	// Se crypto não foi configurado, inicializar básico
	if (typeof (global as any).crypto === "undefined") {
		(global as any).crypto = {} as any;
	}
	
	// Adicionar randomUUID
	if (typeof (global as any).crypto.randomUUID !== "function") {
		(global as any).crypto.randomUUID = () => Crypto.randomUUID().toLowerCase();
	}
} else {
	console.log('✅ [_layout] crypto.subtle já está configurado pelos polyfills');
	// Crypto já foi configurado pelos polyfills, apenas adicionar randomUUID se não existir
	if (typeof (global as any).crypto.randomUUID !== "function") {
		(global as any).crypto.randomUUID = () => Crypto.randomUUID().toLowerCase();
	}
	
	// Verificar se subtle ainda está disponível
	if (!(global as any).crypto.subtle) {
		console.error("❌ [_layout] crypto.subtle foi perdido após polyfills! Tentando restaurar...");
		// Tentar recarregar react-native-quick-crypto
		try {
			const QuickCrypto = require('react-native-quick-crypto');
			if (QuickCrypto.subtle) {
				(global as any).crypto.subtle = QuickCrypto.subtle;
				console.log("✅ [_layout] crypto.subtle restaurado");
			} else {
				console.error("❌ [_layout] QuickCrypto.subtle não está disponível!");
			}
		} catch (e) {
			console.error("❌ [_layout] Falha ao restaurar crypto.subtle:", e);
		}
	} else {
		console.log('✅ [_layout] crypto.subtle ainda está disponível');
		// Verificar importKey
		if ((global as any).crypto.subtle.importKey) {
			console.log('✅ [_layout] crypto.subtle.importKey está disponível');
		} else {
			console.error('❌ [_layout] crypto.subtle.importKey não está disponível!');
		}
	}
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
	constructor(props: { children: React.ReactNode }) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error) {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error("❌ Erro capturado pelo ErrorBoundary:", error);
		console.error("❌ Stack trace:", error.stack);
		console.error("❌ Component stack:", errorInfo.componentStack);
	}

	render() {
		if (this.state.hasError) {
			return (
				<View style={styles.errorContainer}>
					<Text style={styles.errorTitle}>Erro ao carregar o app</Text>
					<Text style={styles.errorText}>{this.state.error?.message || "Erro desconhecido"}</Text>
					<Text style={styles.errorHint}>Verifique os logs para mais detalhes</Text>
				</View>
			);
		}

		return this.props.children;
	}
}

const styles = StyleSheet.create({
	errorContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
		backgroundColor: "#fff",
	},
	errorTitle: {
		fontSize: 20,
		fontWeight: "bold",
		marginBottom: 10,
		color: "#000",
	},
	errorText: {
		fontSize: 14,
		color: "#666",
		textAlign: "center",
		marginBottom: 10,
	},
	errorHint: {
		fontSize: 12,
		color: "#999",
		textAlign: "center",
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#fff",
	},
});

const LoadingFallback = () => (
	<View style={styles.loadingContainer}>
		<ActivityIndicator size="large" color="#007AFF" />
	</View>
);

function AppContent() {
	console.log("🔍 AppContent: Renderizando...");
	
	useEffect(() => {
		(async () => {
			try {
				await requestNotificationPermissions();
			} catch (error) {
				console.error("❌ Erro ao inicializar app:", error);
			}
		})();
	}, []);

	console.log("🔍 AppContent: Renderizando Stack...");
	return (
		<Suspense fallback={<LoadingFallback />}>
			<Stack
				screenOptions={{
					headerStyle: {
						backgroundColor: "#007AFF",
					},
					headerTintColor: "#fff",
					headerTitleStyle: {
						fontWeight: "bold",
					},
				}}
			>
				<Stack.Screen
					name="index"
					options={{
						headerShown: false,
					}}
				/>
				<Stack.Screen
					name="(tabs)"
					options={{
						headerShown: false,
					}}
				/>
				<Stack.Screen
					name="(auth)"
					options={{
						headerShown: false,
					}}
				/>
			</Stack>
		</Suspense>
	);
}

export default function RootLayout() {
	console.log("🔍 RootLayout: Renderizando...");
	return (
		<ErrorBoundary>
			<Providers>
				<AppContent />
				<UpdateDialog />
			</Providers>
		</ErrorBoundary>
	);
}
