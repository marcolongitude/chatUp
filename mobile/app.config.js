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
			version: "1.0.10",
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
				config: {
					googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "",
				},
				infoPlist: {
					NSLocationWhenInUseUsageDescription:
						"O ChatUp usa sua localização para listar contatos dentro do perímetro configurado.",
					NSLocationAlwaysAndWhenInUseUsageDescription:
						"O ChatUp precisa da localização também em segundo plano para manter o perímetro ativo quando você abrir outro app.",
					UIBackgroundModes: ["location"],
				},
			},
			android: {
				adaptiveIcon: {
					foregroundImage: "./assets/logoIcon.png",
					backgroundColor: "#ffffff",
				},
				package: "com.chatup.app",
				versionCode: 11,
				edgeToEdgeEnabled: true,
				predictiveBackGestureEnabled: false,
				config: {
					googleMaps: {
						apiKey: process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "",
					},
				},
				permissions: [
					"ACCESS_FINE_LOCATION",
					"ACCESS_COARSE_LOCATION",
					"ACCESS_BACKGROUND_LOCATION",
					"FOREGROUND_SERVICE",
					"FOREGROUND_SERVICE_LOCATION",
					"android.permission.ACCESS_COARSE_LOCATION",
					"android.permission.ACCESS_FINE_LOCATION",
					"android.permission.ACCESS_BACKGROUND_LOCATION",
					"android.permission.FOREGROUND_SERVICE",
					"android.permission.FOREGROUND_SERVICE_LOCATION",
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
							"O ChatUp precisa da localização também em segundo plano para manter o perímetro ativo quando você abrir outro app.",
						locationWhenInUsePermission:
							"O ChatUp usa sua localização para listar contatos dentro do perímetro configurado.",
						isIosBackgroundLocationEnabled: true,
						isAndroidBackgroundLocationEnabled: true,
						isAndroidForegroundServiceEnabled: true,
					},
				],
				"expo-task-manager",
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
			runtimeVersion: "1.0.10",
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
