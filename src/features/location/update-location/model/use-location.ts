import { useState, useEffect, useCallback } from "react";
import { AppState, AppStateStatus, Linking, Platform, Alert, PermissionsAndroid } from "react-native";
import * as Location from "expo-location";
import Constants from "expo-constants";

// Tipos locais para a feature, podem ser movidos para shared/lib se múltiplos locais usarem
export interface LocationType {
	latitude: number;
	longitude: number;
	updatedAt: Date | string;
}

export interface LocationPermissionStatus {
	granted: boolean;
	canAskAgain: boolean;
	status: 'granted' | 'denied' | 'undetermined';
}

const MOCK_LOCATION: LocationType = {
	latitude: -17.803677,
	longitude: -50.920879,
	updatedAt: new Date(),
};

const SHOULD_USE_MOCK = __DEV__ || Constants.expoConfig?.extra?.forceMockLocation === true;

export function useLocation() {
	const [location, setLocation] = useState<LocationType | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [permissionStatus, setPermissionStatus] = useState<LocationPermissionStatus | null>(null);

	const requestPermission = useCallback(async (): Promise<boolean> => {
		try {
			let status: string = "undetermined";
			let canAskAgain: boolean = true;

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
						status = "granted";
						canAskAgain = false;
					} else if (androidResult === PermissionsAndroid.RESULTS.DENIED) {
						status = "denied";
					}
				} catch (androidErr) {
					console.warn("[Feature/UpdateLocation] PermissionsAndroid error:", androidErr);
				}
			}

			try {
				const expoPermission = await Location.requestForegroundPermissionsAsync();
				if (expoPermission.status === "granted") {
					status = "granted";
					canAskAgain = expoPermission.canAskAgain;
				} else if (status === "undetermined") {
					status = expoPermission.status;
					canAskAgain = expoPermission.canAskAgain;
				}
			} catch (expoErr) {
				console.warn("[Feature/UpdateLocation] Expo-location request error:", expoErr);
			}

			const permission: LocationPermissionStatus = {
				granted: status === "granted",
				canAskAgain,
				status: status as any,
			};

			setPermissionStatus(permission);
			setError(status !== "granted" ? "Permissão de localização negada." : null);
			return status === "granted";
		} catch (err: any) {
			setError(err.message || "Erro ao solicitar permissão");
			return false;
		}
	}, []);

	const checkPermission = useCallback(async () => {
		if (SHOULD_USE_MOCK) {
			setPermissionStatus({ granted: true, canAskAgain: false, status: "granted" });
			return true;
		}

		try {
			let status: string = "undetermined";
			let canAskAgain: boolean = true;

			try {
				const expoPermission = await Location.getForegroundPermissionsAsync();
				status = expoPermission.status;
				canAskAgain = expoPermission.canAskAgain;
			} catch (expoErr) {
                console.warn("[Feature/UpdateLocation] Expo-location check error:", expoErr);
			}

			if (Platform.OS === "android") {
				try {
					const androidFine = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
					const androidCoarse = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
					if (androidFine || androidCoarse) {
						status = "granted";
						canAskAgain = false;
					}
				} catch (androidErr) {
                    console.warn("[Feature/UpdateLocation] PermissionsAndroid check error:", androidErr);
				}
			}

			setPermissionStatus({ granted: status === "granted", canAskAgain, status: status as any });
			return status === "granted";
		} catch (err) {
			return false;
		}
	}, []);

	const updateLocation = useCallback(async () => {
		if (SHOULD_USE_MOCK) {
			setIsLoading(true);
			await new Promise((r) => setTimeout(r, 100));
			setLocation({ ...MOCK_LOCATION, updatedAt: new Date() });
			setIsLoading(false);
			return;
		}

		try {
			const hasPermission = await checkPermission();
			if (!hasPermission) {
				const granted = await requestPermission();
				if (!granted) { setIsLoading(false); return; }
			}

			setIsLoading(true);
			const isEnabled = await Location.hasServicesEnabledAsync();
			if (!isEnabled) throw new Error("GPS desabilitado.");

			const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
			setLocation({ latitude: result.coords.latitude, longitude: result.coords.longitude, updatedAt: new Date() });
			setError(null);
		} catch (err: any) {
			setError(err.message || "Erro ao obter localização.");
		} finally {
			setIsLoading(false);
		}
	}, [checkPermission, requestPermission]);

	useEffect(() => {
		checkPermission().then(granted => { if (granted) updateLocation(); else setIsLoading(false); });
	}, []);

	const openSettings = useCallback(async () => {
		try {
            if (Platform.OS === "android") await Linking.openSettings();
            else await Linking.openURL("app-settings:");
		} catch (err) {
			Alert.alert("Erro", "Não foi possível abrir as configurações.");
		}
	}, []);

	return { location, isLoading, error, permissionStatus, requestPermission, updateLocation, openSettings };
}
