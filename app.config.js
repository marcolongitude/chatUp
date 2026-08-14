/**
 * Configuração dinâmica do Expo
 * Carrega variáveis de ambiente do arquivo .env
 */

require("dotenv").config();

/** Base pública da API (staging VPS Rancher). */
const DEFAULT_PUBLIC_API_URL = "https://chatup-api.147.15.92.201.sslip.io";

/** Client IDs OAuth — fallbacks para não depender só do env no build nativo. */
const DEFAULT_GOOGLE_ANDROID_CLIENT_ID =
	"510679848324-4nfiam1u85fciohe6t8p6n2rdtdkq5kk.apps.googleusercontent.com";
const DEFAULT_GOOGLE_WEB_CLIENT_ID =
	"510679848324-uicijmb0d26ebf3rlo0qil5pjuk9d1ea.apps.googleusercontent.com";

module.exports = () => {
	const googleAndroidClientId =
		process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || DEFAULT_GOOGLE_ANDROID_CLIENT_ID;
	const googleWebClientId =
		process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || DEFAULT_GOOGLE_WEB_CLIENT_ID;
	const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
	const toGoogleScheme = (clientId) => {
		const id = String(clientId).replace(/\.apps\.googleusercontent\.com$/i, "");
		return `com.googleusercontent.apps.${id}`;
	};
	// iosUrlScheme do plugin Google Sign-In (iOS client, senão web).
	const iosUrlScheme = toGoogleScheme(googleIosClientId || googleWebClientId);
	const googleSchemes = [googleAndroidClientId, googleIosClientId, googleWebClientId]
		.filter(Boolean)
		.map(toGoogleScheme);
	const schemes = ["chatup", ...new Set(googleSchemes)];

	return {
		expo: {
			name: "chatUp",
			slug: "chatUp",
			version: "1.0.7",
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
				versionCode: 8,
				edgeToEdgeEnabled: true,
				predictiveBackGestureEnabled: false,
				permissions: [
					"ACCESS_FINE_LOCATION",
					"ACCESS_COARSE_LOCATION",
					"android.permission.ACCESS_COARSE_LOCATION",
					"android.permission.ACCESS_FINE_LOCATION",
					"android.permission.POST_NOTIFICATIONS",
					"POST_NOTIFICATIONS",
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
				"expo-localization",
				"expo-web-browser",
				"expo-build-properties",
				"react-native-quick-crypto",
				[
					"expo-notifications",
					{
						color: "#5b9bd5",
						defaultChannel: "messages",
					},
				],
				[
					"@react-native-google-signin/google-signin",
					{
						iosUrlScheme,
					},
				],
			],
			updates: {
				enabled: true,
				checkAutomatically: "ON_LOAD",
				fallbackToCacheTimeout: 0,
				url: "https://u.expo.dev/d662ef19-e2a8-4cf3-b18a-564a4faa4a3d",
			},
			runtimeVersion: "1.0.7",
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
