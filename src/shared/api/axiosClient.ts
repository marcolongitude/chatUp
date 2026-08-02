import axios from "axios";
import { Platform } from "react-native";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY_TOKEN = "auth.token";

/** Alinhado ao fallback em app.config.js (API staging VPS Rancher). */
const DEFAULT_PUBLIC_API_URL = "https://chatup-api.147.15.92.201.sslip.io";

/**
 * Determina a URL da API com base no ambiente (FSD Shared)
 */
const getApiUrl = () => {
    if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
    if (Constants.expoConfig?.extra?.apiUrl) return Constants.expoConfig.extra.apiUrl;

    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
        const ip = hostUri.split(":")[0];
        if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
            return `http://${ip}:3000`;
        }
    }

    if (Platform.OS === "android" && !Constants.isDevice) return "http://10.0.2.2:3000";
    return DEFAULT_PUBLIC_API_URL;
};

export const API_URL = getApiUrl();
console.log("[Shared/API] API_URL initialized:", API_URL);

const axiosInstance = axios.create({
	baseURL: API_URL,
	timeout: 10000,
	headers: {
		"Content-Type": "application/json",
	},
});

// Interceptor para adicionar token de autenticação
axiosInstance.interceptors.request.use(
	async (config) => {
		try {
			const token = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
			if (token) {
				if (config.headers.set) {
					config.headers.set("Authorization", `Bearer ${token}`);
				} else {
					(config.headers as any).Authorization = `Bearer ${token}`;
				}
			}
		} catch (error) {
			console.error("[Shared/API] Error getting auth token:", error);
		}
		return config;
	},
	(error) => Promise.reject(error)
);

type AuthExpiredListener = () => void;
const authExpiredListeners = new Set<AuthExpiredListener>();

/** Subscribe to API 401s so the auth layer can clear session + redirect. */
export function onAuthExpired(listener: AuthExpiredListener): () => void {
	authExpiredListeners.add(listener);
	return () => {
		authExpiredListeners.delete(listener);
	};
}

function emitAuthExpired() {
	authExpiredListeners.forEach((listener) => {
		try {
			listener();
		} catch (err) {
			console.warn("[Shared/API] auth-expired listener failed", err);
		}
	});
}

// Interceptor para tratamento de erros centralizado
axiosInstance.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response) {
			const { status } = error.response;
			if (status === 401) {
				console.warn("[Shared/API] Unauthorized (401)");
				emitAuthExpired();
			}
			if (status === 403) console.warn("[Shared/API] Forbidden (403)");
		} else if (error.request) {
			console.error("[Shared/API] Network error (No response)");
		} else {
			console.error("[Shared/API] Error setting up request:", error.message);
		}
		return Promise.reject(error);
	}
);

export { axiosInstance };
