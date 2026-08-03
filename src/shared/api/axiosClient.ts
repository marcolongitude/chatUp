import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { Platform } from "react-native";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY_TOKEN = "auth.token";
const STORAGE_KEY_REFRESH = "auth.refreshToken";

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

type AuthExpiredListener = () => void;
const authExpiredListeners = new Set<AuthExpiredListener>();

/** Subscribe when refresh fails / session is unrecoverable. */
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

function shouldSkipRefresh(config?: InternalAxiosRequestConfig): boolean {
	if (!config) return true;
	if (config.headers?.["X-Skip-Auth-Refresh"] === "1") return true;
	const url = `${config.baseURL ?? ""}${config.url ?? ""}`;
	return /\/auth\/(login|register|google|refresh|logout)\b/.test(url);
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
	if (refreshPromise) {
		return refreshPromise;
	}

	refreshPromise = (async () => {
		const refreshToken = await AsyncStorage.getItem(STORAGE_KEY_REFRESH);
		if (!refreshToken) {
			return null;
		}
		try {
			// Plain axios to avoid interceptor recursion.
			const { data } = await axios.post<{
				accessToken?: string;
				refreshToken?: string;
			}>(
				`${API_URL}/auth/refresh`,
				{ refreshToken },
				{ headers: { "Content-Type": "application/json" }, timeout: 10000 }
			);
			if (!data.accessToken || !data.refreshToken) {
				return null;
			}
			await AsyncStorage.setItem(STORAGE_KEY_TOKEN, data.accessToken);
			await AsyncStorage.setItem(STORAGE_KEY_REFRESH, data.refreshToken);
			return data.accessToken;
		} catch (error) {
			console.warn("[Shared/API] Refresh token failed", error);
			return null;
		} finally {
			refreshPromise = null;
		}
	})();

	return refreshPromise;
}

axiosInstance.interceptors.request.use(
	async (config) => {
		try {
			const token = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
			if (token) {
				if (config.headers.set) {
					config.headers.set("Authorization", `Bearer ${token}`);
				} else {
					(config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
				}
			}
		} catch (error) {
			console.error("[Shared/API] Error getting auth token:", error);
		}
		return config;
	},
	(error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
	(response) => response,
	async (error: AxiosError) => {
		const status = error.response?.status;
		const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

		if (status === 401 && original && !original._retry && !shouldSkipRefresh(original)) {
			original._retry = true;
			const newToken = await refreshAccessToken();
			if (newToken) {
				if (original.headers.set) {
					original.headers.set("Authorization", `Bearer ${newToken}`);
				} else {
					(original.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
				}
				return axiosInstance(original);
			}
			console.warn("[Shared/API] Unauthorized (401) — refresh exhausted");
			emitAuthExpired();
		} else if (status === 401) {
			console.warn("[Shared/API] Unauthorized (401)");
			if (!shouldSkipRefresh(original)) {
				emitAuthExpired();
			}
		}

		if (status === 403) console.warn("[Shared/API] Forbidden (403)");
		if (!error.response && error.request) {
			console.error("[Shared/API] Network error (No response)");
		} else if (!error.response) {
			console.error("[Shared/API] Error setting up request:", error.message);
		}
		return Promise.reject(error);
	}
);

export { axiosInstance, STORAGE_KEY_TOKEN, STORAGE_KEY_REFRESH };
