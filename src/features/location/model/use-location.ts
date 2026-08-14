import { useState, useEffect, useCallback, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import * as Location from "expo-location";
import Constants from "expo-constants";

import {
	ensureLocationPermission,
	getLocationPermissionStatus,
	openAppSystemSettings,
} from "../lib/ensure-location-permission";
import { openLocationSettings } from "../lib/open-location-settings";
import { registerLocationSessionActions } from "./location-session-actions";
import type { LocationModel, LocationPermissionStatus } from "./location";

const MOCK_LOCATION: LocationModel = {
	latitude: -17.803677,
	longitude: -50.920879,
	updatedAt: new Date(),
};

const SHOULD_USE_MOCK = __DEV__ || Constants.expoConfig?.extra?.forceMockLocation === true;
const WATCH_TIME_INTERVAL_MS = 15_000;
/** 0 = prioriza timeInterval no Android (parado no chat ainda atualiza). */
const WATCH_DISTANCE_M = 0;

export function useLocation() {
	const [location, setLocation] = useState<LocationModel | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [permissionStatus, setPermissionStatus] = useState<LocationPermissionStatus | null>(null);
	const watchRef = useRef<Location.LocationSubscription | null>(null);
	const startGenerationRef = useRef(0);

	const stopWatch = useCallback(() => {
		watchRef.current?.remove();
		watchRef.current = null;
	}, []);

	const applyPermission = useCallback((result: {
		granted: boolean;
		canAskAgain: boolean;
		status: string;
	}) => {
		const permission: LocationPermissionStatus = {
			granted: result.granted,
			canAskAgain: result.canAskAgain,
			status: result.status as LocationPermissionStatus["status"],
		};
		setPermissionStatus(permission);
		if (!result.granted) {
			setError("Permissão de localização negada.");
		}
		return result.granted;
	}, []);

	const checkPermission = useCallback(async () => {
		if (SHOULD_USE_MOCK) {
			setPermissionStatus({ granted: true, canAskAgain: false, status: "granted" });
			return true;
		}
		const result = await getLocationPermissionStatus();
		return applyPermission(result);
	}, [applyPermission]);

	const requestPermission = useCallback(async (): Promise<boolean> => {
		if (SHOULD_USE_MOCK) {
			setPermissionStatus({ granted: true, canAskAgain: false, status: "granted" });
			setError(null);
			return true;
		}
		const result = await ensureLocationPermission();
		const granted = applyPermission(result);
		if (granted) setError(null);
		return granted;
	}, [applyPermission]);

	const readCurrentPosition = useCallback(async () => {
		const isEnabled = await Location.hasServicesEnabledAsync();
		if (!isEnabled) {
			throw new Error("GPS desabilitado.");
		}
		const result = await Location.getCurrentPositionAsync({
			accuracy: Location.Accuracy.Balanced,
		});
		setLocation({
			latitude: result.coords.latitude,
			longitude: result.coords.longitude,
			updatedAt: new Date(),
		});
		setError(null);
	}, []);

	const startWatch = useCallback(async () => {
		if (SHOULD_USE_MOCK) return;
		stopWatch();
		try {
			watchRef.current = await Location.watchPositionAsync(
				{
					accuracy: Location.Accuracy.Balanced,
					timeInterval: WATCH_TIME_INTERVAL_MS,
					distanceInterval: WATCH_DISTANCE_M,
				},
				(result) => {
					setLocation({
						latitude: result.coords.latitude,
						longitude: result.coords.longitude,
						updatedAt: new Date(),
					});
					setError(null);
					setIsLoading(false);
				}
			);
		} catch (err: unknown) {
			console.warn("[Feature/Location] watchPositionAsync error:", err);
		}
	}, [stopWatch]);

	const updateLocation = useCallback(async () => {
		if (SHOULD_USE_MOCK) {
			setIsLoading(true);
			await new Promise((resolve) => setTimeout(resolve, 100));
			setLocation({ ...MOCK_LOCATION, updatedAt: new Date() });
			setIsLoading(false);
			setError(null);
			return;
		}

		try {
			const hasPermission = await checkPermission();
			if (!hasPermission) {
				const granted = await requestPermission();
				if (!granted) {
					setIsLoading(false);
					stopWatch();
					return;
				}
			}

			setIsLoading(true);
			await readCurrentPosition();
			await startWatch();
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Erro ao obter localização.";
			setError(message);
		} finally {
			setIsLoading(false);
		}
	}, [checkPermission, requestPermission, readCurrentPosition, startWatch, stopWatch]);

	const bootstrap = useCallback(async () => {
		const generation = ++startGenerationRef.current;

		if (SHOULD_USE_MOCK) {
			setIsLoading(true);
			await new Promise((resolve) => setTimeout(resolve, 100));
			if (generation !== startGenerationRef.current) return;
			setLocation({ ...MOCK_LOCATION, updatedAt: new Date() });
			setPermissionStatus({ granted: true, canAskAgain: false, status: "granted" });
			setError(null);
			setIsLoading(false);
			return;
		}

		setIsLoading(true);
		const current = await getLocationPermissionStatus();
		if (generation !== startGenerationRef.current) return;

		if (current.granted) {
			applyPermission(current);
			try {
				await readCurrentPosition();
				if (generation !== startGenerationRef.current) return;
				await startWatch();
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : "Erro ao obter localização.";
				setError(message);
			} finally {
				if (generation === startGenerationRef.current) setIsLoading(false);
			}
			return;
		}

		if (current.status === "undetermined" || current.canAskAgain) {
			const granted = await requestPermission();
			if (generation !== startGenerationRef.current) return;
			if (granted) {
				try {
					await readCurrentPosition();
					if (generation !== startGenerationRef.current) return;
					await startWatch();
				} catch (err: unknown) {
					const message = err instanceof Error ? err.message : "Erro ao obter localização.";
					setError(message);
				} finally {
					if (generation === startGenerationRef.current) setIsLoading(false);
				}
				return;
			}
		} else {
			applyPermission(current);
		}

		setIsLoading(false);
		stopWatch();
	}, [applyPermission, readCurrentPosition, requestPermission, startWatch, stopWatch]);

	useEffect(() => {
		void bootstrap();
		return () => {
			startGenerationRef.current += 1;
			stopWatch();
		};
	}, [bootstrap, stopWatch]);

	useEffect(() => {
		const onAppState = (next: AppStateStatus) => {
			if (next !== "active") return;
			void (async () => {
				if (SHOULD_USE_MOCK) return;
				const current = await getLocationPermissionStatus();
				applyPermission(current);
				if (!current.granted) {
					stopWatch();
					setIsLoading(false);
					return;
				}
				setError(null);
				try {
					await readCurrentPosition();
					await startWatch();
				} catch (err: unknown) {
					const message = err instanceof Error ? err.message : "Erro ao obter localização.";
					setError(message);
				}
			})();
		};
		const sub = AppState.addEventListener("change", onAppState);
		return () => sub.remove();
	}, [applyPermission, readCurrentPosition, startWatch, stopWatch]);

	useEffect(() => {
		registerLocationSessionActions({
			requestPermission: async () => {
				const granted = await requestPermission();
				if (granted) await updateLocation();
				return granted;
			},
			refreshLocation: updateLocation,
			openSettings: openLocationSettings,
		});
		return () => registerLocationSessionActions(null);
	}, [requestPermission, updateLocation]);

	return {
		location,
		isLoading,
		error,
		permissionStatus,
		requestPermission,
		updateLocation,
		checkPermission,
		openSettings: openAppSystemSettings,
	};
}
