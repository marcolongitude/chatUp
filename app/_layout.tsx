// MUST BE THE VERY FIRST IMPORT
import "@/app/config/polyfills";

import { Stack } from "expo-router";
import { Providers } from "@/app/providers";
import { UpdateDialog } from "@/shared/ui";
import React, { Suspense, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { requestNotificationPermissions } from "@/services/notifications";

// Polyfill global crypto
import * as Crypto from "expo-crypto";
if (typeof (global as any).crypto === "undefined") {
	(global as any).crypto = {} as any;
}
if (typeof (global as any).crypto.randomUUID !== "function") {
	(global as any).crypto.randomUUID = () => Crypto.randomUUID().toLowerCase();
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
	useEffect(() => {
		(async () => {
			try {
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
			<Providers>
				<AppContent />
				<UpdateDialog />
			</Providers>
		</ErrorBoundary>
	);
}
