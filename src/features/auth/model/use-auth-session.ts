import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

import { initializeCrypto } from "../lib/crypto-init";
import type { UserProfile } from "./auth";

const STORAGE_KEY_TOKEN = "auth.token";
const STORAGE_KEY_USER = "auth.user";

export interface AuthUser {
	id: string;
	email: string | null;
	displayName: string | null;
	photoURL: string | null;
	getIdToken: () => Promise<string>;
}

let globalUser: AuthUser | null = null;
let globalUserProfile: UserProfile | null = null;
let globalIsLoading = true;
let restorePromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

async function readStoredToken(): Promise<string> {
	return (await AsyncStorage.getItem(STORAGE_KEY_TOKEN)) || "";
}

function buildAuthUser(saved: Omit<AuthUser, "getIdToken">): AuthUser {
	return {
		...saved,
		getIdToken: readStoredToken,
	};
}

async function restoreSessionOnce(): Promise<void> {
	if (restorePromise) {
		return restorePromise;
	}

	restorePromise = (async () => {
		try {
			const token = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
			const savedUserRaw = await AsyncStorage.getItem(STORAGE_KEY_USER);

			if (!token || !savedUserRaw) {
				globalUser = null;
				globalUserProfile = null;
				return;
			}

			const savedUser = JSON.parse(savedUserRaw) as Omit<AuthUser, "getIdToken">;
			if (!savedUser?.id) {
				await AsyncStorage.multiRemove([STORAGE_KEY_TOKEN, STORAGE_KEY_USER]);
				globalUser = null;
				globalUserProfile = null;
				return;
			}

			globalUser = buildAuthUser(savedUser);
			globalUserProfile = {
				id: savedUser.id,
				email: savedUser.email || "",
				displayName: savedUser.displayName || "",
				hasProfile: true,
				photoURL: savedUser.photoURL || undefined,
			};
			// Notify early so UI can leave the boot splash while crypto finishes.
			notify();

			try {
				await initializeCrypto(savedUser.id);
			} catch (cryptoError) {
				console.warn("[Auth] Crypto bootstrap after restore failed", cryptoError);
			}
		} catch (error) {
			console.error("[Auth] Failed to restore session", error);
			globalUser = null;
			globalUserProfile = null;
		} finally {
			globalIsLoading = false;
			notify();
		}
	})();

	return restorePromise;
}

/** Kick off restore as soon as the module loads (not only on first hook mount). */
void restoreSessionOnce();

export function useAuthSession() {
	const [, setTick] = useState(0);

	useEffect(() => {
		const listener = () => setTick((value) => value + 1);
		listeners.add(listener);
		void restoreSessionOnce();
		return () => {
			listeners.delete(listener);
		};
	}, []);

	const setSession = async (token: string, user: AuthUser, profile: UserProfile) => {
		if (!token?.trim()) {
			throw new Error("Login returned an empty access token");
		}
		if (!user?.id) {
			throw new Error("Login returned an invalid user");
		}

		await AsyncStorage.setItem(STORAGE_KEY_TOKEN, token);
		await AsyncStorage.setItem(
			STORAGE_KEY_USER,
			JSON.stringify({
				id: user.id,
				email: user.email,
				displayName: user.displayName,
				photoURL: user.photoURL,
			})
		);

		globalUser = buildAuthUser({
			id: user.id,
			email: user.email,
			displayName: user.displayName,
			photoURL: user.photoURL,
		});
		globalUserProfile = profile;
		globalIsLoading = false;
		notify();
	};

	const clearSession = async () => {
		await AsyncStorage.multiRemove([STORAGE_KEY_TOKEN, STORAGE_KEY_USER]);
		globalUser = null;
		globalUserProfile = null;
		globalIsLoading = false;
		notify();
	};

	const updateProfile = async (profile: UserProfile) => {
		globalUserProfile = profile;

		if (globalUser) {
			const updatedUser = buildAuthUser({
				id: globalUser.id,
				email: globalUser.email,
				displayName: profile.displayName,
				photoURL: profile.photoURL || null,
			});

			globalUser = updatedUser;

			await AsyncStorage.setItem(
				STORAGE_KEY_USER,
				JSON.stringify({
					id: updatedUser.id,
					email: updatedUser.email,
					displayName: updatedUser.displayName,
					photoURL: updatedUser.photoURL,
				})
			);
		}

		notify();
	};

	return {
		user: globalUser,
		userProfile: globalUserProfile,
		isAuthenticated: !!globalUser,
		isLoading: globalIsLoading,
		setSession,
		clearSession,
		updateProfile,
	};
}
