import { Linking, Platform, PermissionsAndroid } from "react-native";
import * as Location from "expo-location";

export type LocationPermissionResult = {
	granted: boolean;
	canAskAgain: boolean;
	status: "granted" | "denied" | "undetermined" | string;
};

/** Lê o estado atual da permissão de localização (sem prompt). */
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

/** Solicita permissão de localização (dialog nativo quando ainda é possível). */
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

/** Abre as configurações do app no sistema (localização / notificações). */
export async function openAppSystemSettings(): Promise<void> {
	if (Platform.OS === "android") {
		await Linking.openSettings();
		return;
	}
	await Linking.openURL("app-settings:");
}
