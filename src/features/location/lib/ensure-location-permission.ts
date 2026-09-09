import { Linking, Platform, PermissionsAndroid } from "react-native";
import * as Location from "expo-location";

export type LocationPermissionResult = {
	granted: boolean;
	canAskAgain: boolean;
	status: "granted" | "denied" | "undetermined" | string;
};

/** Lê o estado atual da permissão de localização em primeiro plano (sem prompt). */
export async function getLocationPermissionStatus(): Promise<LocationPermissionResult> {
	let status: string = "undetermined";
	let canAskAgain = true;

	try {
		const expoPermission = await Location.getForegroundPermissionsAsync();
		status = expoPermission.status;
		canAskAgain = expoPermission.canAskAgain;
	} catch {
		// fall through to Android check
	}

	if (Platform.OS === "android") {
		try {
			const fine = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
			const coarse = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
			if (fine || coarse) {
				return { granted: true, canAskAgain: false, status: "granted" };
			}
		} catch {
			// ignore
		}
	}

	return {
		granted: status === "granted",
		canAskAgain,
		status,
	};
}

/** Lê permissão de localização em segundo plano (Always / ACCESS_BACKGROUND_LOCATION). */
export async function getBackgroundLocationPermissionStatus(): Promise<LocationPermissionResult> {
	try {
		const result = await Location.getBackgroundPermissionsAsync();
		return {
			granted: result.status === "granted",
			canAskAgain: result.canAskAgain,
			status: result.status,
		};
	} catch {
		return { granted: false, canAskAgain: false, status: "undetermined" };
	}
}

/** Solicita permissão de localização em primeiro plano (dialog nativo quando ainda é possível). */
export async function ensureLocationPermission(): Promise<LocationPermissionResult> {
	const current = await getLocationPermissionStatus();
	if (current.granted) return current;

	if (Platform.OS === "android") {
		try {
			const androidResult = await PermissionsAndroid.request(
				PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
				{
					title: "Permissão de Localização",
					message: "Este app precisa da sua localização para mostrar usuários próximos a você.",
					buttonNeutral: "Perguntar depois",
					buttonNegative: "Cancelar",
					buttonPositive: "OK",
				}
			);
			if (androidResult === PermissionsAndroid.RESULTS.GRANTED) {
				return { granted: true, canAskAgain: false, status: "granted" };
			}
		} catch {
			// continue with expo
		}
	}

	try {
		const expoPermission = await Location.requestForegroundPermissionsAsync();
		return {
			granted: expoPermission.status === "granted",
			canAskAgain: expoPermission.canAskAgain,
			status: expoPermission.status,
		};
	} catch {
		return { granted: false, canAskAgain: current.canAskAgain, status: "denied" };
	}
}

/**
 * Solicita localização em segundo plano. No Android 10+ deve vir depois do foreground.
 * Sem Always, o monitoring em background fica limitado/OS pode pausar.
 */
export async function ensureBackgroundLocationPermission(): Promise<LocationPermissionResult> {
	const foreground = await getLocationPermissionStatus();
	if (!foreground.granted) {
		return { granted: false, canAskAgain: foreground.canAskAgain, status: "denied" };
	}

	const current = await getBackgroundLocationPermissionStatus();
	if (current.granted) return current;

	try {
		const result = await Location.requestBackgroundPermissionsAsync();
		return {
			granted: result.status === "granted",
			canAskAgain: result.canAskAgain,
			status: result.status,
		};
	} catch {
		return { granted: false, canAskAgain: current.canAskAgain, status: "denied" };
	}
}

/** Abre as configurações do app no sistema (localização / notificações). */
export async function openAppSystemSettings(): Promise<void> {
	if (Platform.OS === "android") {
		await Linking.openSettings();
		return;
	}
	await Linking.openURL("app-settings:");
}
