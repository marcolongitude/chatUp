/**
 * Configuração dinâmica do Expo
 * Carrega variáveis de ambiente do arquivo .env
 */

require("dotenv").config();

module.exports = () => {
	return {
		expo: {
			name: "chatUp",
			slug: "chatUp",
			version: "1.0.2",
			orientation: "portrait",
			icon: "./assets/logoIcon.png",
			userInterfaceStyle: "light",
			newArchEnabled: true,
			scheme: "chatup",
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
				"expo-router",
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
				router: {},
				eas: {
					projectId: "d662ef19-e2a8-4cf3-b18a-564a4faa4a3d",
				},
				// API and Electric SQL URLs
				apiUrl: process.env.EXPO_PUBLIC_API_URL || 
					(`http://${process.env.LOCAL_IP || '192.168.0.18'}:3000`),
				electricUrl: process.env.EXPO_PUBLIC_ELECTRIC_URL || 
					(`http://${process.env.LOCAL_IP || '192.168.0.18'}:5133/v1/shape`),
				electricApiUrl: process.env.EXPO_PUBLIC_ELECTRIC_API_URL || 
					(`http://${process.env.LOCAL_IP || '192.168.0.18'}:5133`),
			},
		},
	};
};
