// Polyfill for crypto.randomUUID() required by TanStack DB
// Using expo-crypto which is already installed
import * as Crypto from "expo-crypto";

// Polyfill crypto.randomUUID if not available
if (typeof global.crypto === "undefined") {
	(global as any).crypto = {};
}
if (typeof (global as any).crypto.randomUUID !== "function") {
	// expo-crypto.randomUUID() is synchronous
	(global as any).crypto.randomUUID = () => {
		return Crypto.randomUUID().toLowerCase();
	};
}

import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/core/queryClient";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "@/core/theme/ThemeProvider";
import { I18nProvider } from "@/core/i18n/I18nProvider";
import { ElectricProvider } from "@/core/electric";
import { DatabaseProvider } from "@/core/database/DatabaseProvider";
import { UpdateDialog, CryptoLoadingProvider } from "@/shared/components";
import React, { Suspense, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
// import "@/core/firebase";
// Database initialization removed - Electric SQL handles data storage
import { requestNotificationPermissions } from "@/services/notifications";

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
		if (__DEV__) {
			console.error("❌ Error info completo:", errorInfo);
		}
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
	useEffect(() => {
		(async () => {
			try {
				// Electric SQL handles database initialization automatically
				// Solicitar permissões de notificação
				await requestNotificationPermissions();
			} catch (error) {
				console.error("❌ Erro ao inicializar app:", error);
			}
		})();
	}, []);

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
	return (
		<ErrorBoundary>
			<SafeAreaProvider>
				<I18nProvider>
					<ThemeProvider>
						<CryptoLoadingProvider>
							<QueryClientProvider client={queryClient}>
								<DatabaseProvider>
									<ElectricProvider>
										<AppContent />
										<UpdateDialog />
									</ElectricProvider>
								</DatabaseProvider>
							</QueryClientProvider>
						</CryptoLoadingProvider>
					</ThemeProvider>
				</I18nProvider>
			</SafeAreaProvider>
		</ErrorBoundary>
	);
}
