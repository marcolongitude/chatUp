/**
 * Configuração dinâmica do Expo
 * Carrega variáveis de ambiente do arquivo .env
 */

require("dotenv").config();

/** Base pública da API (ngrok -> ingress Rancher/k3d). Atualize ao mudar o túnel. */
const DEFAULT_PUBLIC_API_URL = "https://languid-untoadying-jayne.ngrok-free.dev";

module.exports = () => {
	const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
	const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
	const googleSchemes = [
		googleAndroidClientId,
		googleIosClientId,
	]
		.filter(Boolean)
		.map((clientId) => `com.googleusercontent.apps.${clientId}`);
	const schemes = ["chatup", ...googleSchemes];

	return {
		expo: {
			name: "chatUp",
			slug: "chatUp",
			version: "1.0.2",
			orientation: "portrait",
			// Ícone do app (iOS, Android, splash) – assets/logoIcon.png
			icon: "./assets/logoIcon.png",
			userInterfaceStyle: "light",
			newArchEnabled: true,
			scheme: schemes.length === 1 ? schemes[0] : schemes,
			splash: {
				image: "./assets/logoIcon.png",
				resizeMode: "contain",
				backgroundColor: "#ffffff",
			},
			ios: {
				supportsTablet: true,
				bundleIdentifier: "com.chatup.app",
				infoPlist: {
					NSLocationWhenInUseUsageDescription:
						"Este app precisa da sua localização para mostrar usuários próximos a você.",
					NSLocationAlwaysAndWhenInUseUsageDescription:
						"Este app precisa da sua localização para mostrar usuários próximos a você.",
				},
			},
			android: {
				adaptiveIcon: {
					foregroundImage: "./assets/logoIcon.png",
					backgroundColor: "#ffffff",
				},
				package: "com.chatup.app",
				versionCode: 3,
				edgeToEdgeEnabled: true,
				predictiveBackGestureEnabled: false,
				permissions: [
					"ACCESS_FINE_LOCATION",
					"ACCESS_COARSE_LOCATION",
					"android.permission.ACCESS_COARSE_LOCATION",
					"android.permission.ACCESS_FINE_LOCATION",
				],
				usesCleartextTraffic: true,
			},
			web: {
				favicon: "./assets/favicon.png",
			},
			plugins: [
				[
					"expo-location",
					{
						locationAlwaysAndWhenInUsePermission:
							"Este app precisa da sua localização para mostrar usuários próximos a você.",
						locationWhenInUsePermission:
							"Este app precisa da sua localização para mostrar usuários próximos a você.",
					},
				],
				"expo-font",
			],
			updates: {
				enabled: true,
				checkAutomatically: "ON_LOAD",
				fallbackToCacheTimeout: 0,
				url: "https://u.expo.dev/d662ef19-e2a8-4cf3-b18a-564a4faa4a3d",
			},
			runtimeVersion: "1.0.2",
			extra: {
				router: {
					origin: false,
				},
				eas: {
					projectId: "d662ef19-e2a8-4cf3-b18a-564a4faa4a3d",
				},
				// API base URL
				apiUrl: process.env.EXPO_PUBLIC_API_URL || DEFAULT_PUBLIC_API_URL,
			},
		},
	};
};
