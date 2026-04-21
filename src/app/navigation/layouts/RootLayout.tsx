import React, { Suspense, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Outlet } from "@tanstack/react-router";
import { UpdateDialog } from "@/shared/ui";
import { requestNotificationPermissions } from "@/shared/lib/notifications";

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
	constructor(props: { children: React.ReactNode }) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error) {
		return { hasError: true, error };
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

export function RootLayout() {
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
		<ErrorBoundary>
			<Suspense fallback={<LoadingFallback />}>
				<Outlet />
			</Suspense>
			<UpdateDialog />
		</ErrorBoundary>
	);
}
