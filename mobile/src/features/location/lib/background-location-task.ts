import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

import { requestNotificationPermissions } from "@/shared/lib/notifications";

import { updateLocationApi } from "../api/update-location.api";
import {
	BG_LOCATION_TIME_INTERVAL_MS,
	shouldPushBackgroundLocation,
} from "./background-location-policy";

/** Nome estável da task — deve bater com startLocationUpdatesAsync. */
export const BACKGROUND_LOCATION_TASK = "chatup-background-location";

/** Bump ao mudar opções nativas: task já iniciada é reiniciada uma vez. */
const LOCATION_TASK_OPTIONS_VERSION = 2;

let lastBgPushAt = 0;
let lastBgCoords: { latitude: number; longitude: number } | null = null;

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const toRad = (d: number) => (d * Math.PI) / 180;
	const R = 6371000;
	const dLat = toRad(lat2 - lat1);
	const dLng = toRad(lng2 - lng1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Task global (fora do React). Continua recebendo GPS com o app em segundo plano
 * e faz PUT /location para o peer detectar saída/entrada de perímetro.
 */
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
	if (error) {
		console.warn("[BackgroundLocation] task error:", error.message);
		return;
	}

	const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations;
	if (!locations || locations.length === 0) return;

	const latest = locations[locations.length - 1];
	const { latitude, longitude } = latest.coords;
	const now = Date.now();
	const prev = lastBgCoords;
	const movedM = prev
		? haversineMeters(prev.latitude, prev.longitude, latitude, longitude)
		: Number.POSITIVE_INFINITY;

	if (!shouldPushBackgroundLocation({ now, lastPushAt: lastBgPushAt, movedMeters: movedM })) return;

	try {
		await updateLocationApi(latitude, longitude);
		lastBgPushAt = now;
		lastBgCoords = { latitude, longitude };
	} catch (err: unknown) {
		console.warn("[BackgroundLocation] PUT /location failed:", err);
	}
});

export async function isBackgroundLocationRunning(): Promise<boolean> {
	try {
		return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
	} catch {
		return false;
	}
}

/**
 * Inicia tracking nativo (foreground service no Android).
 * Requer permissão de background quando possível; no Android o FGS cobre
 * o caso “app aberto em segundo plano” mesmo sem Always em alguns OEMs.
 */
let appliedOptionsVersion = 0;

export async function startBackgroundLocationTracking(): Promise<boolean> {
	try {
		const foreground = await Location.getForegroundPermissionsAsync();
		if (foreground.status !== "granted") return false;

		const servicesOn = await Location.hasServicesEnabledAsync();
		if (!servicesOn) return false;

		// Android 13+ não sobe o foreground service sem permissão de notificação.
		await requestNotificationPermissions();

		const already = await isBackgroundLocationRunning();
		if (already && appliedOptionsVersion === LOCATION_TASK_OPTIONS_VERSION) return true;
		if (already) {
			await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
		}

		await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
			accuracy: Location.Accuracy.Balanced,
			// 0 m: no Android timeInterval só vale se distanceInterval não exigir deslocamento.
			// Com 25 m o app parado em segundo plano deixava de atualizar e sumia da lista.
			timeInterval: BG_LOCATION_TIME_INTERVAL_MS,
			distanceInterval: 0,
			showsBackgroundLocationIndicator: true,
			pausesUpdatesAutomatically: false,
			activityType: Location.ActivityType.OtherNavigation,
			foregroundService: {
				notificationTitle: "ChatUp",
				notificationBody: "Monitorando proximidade com contatos próximos.",
				notificationColor: "#5b9bd5",
			},
		});
		appliedOptionsVersion = LOCATION_TASK_OPTIONS_VERSION;
		return true;
	} catch (err: unknown) {
		console.warn("[BackgroundLocation] start failed:", err);
		return false;
	}
}

export async function stopBackgroundLocationTracking(): Promise<void> {
	try {
		const running = await isBackgroundLocationRunning();
		if (running) {
			await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
		}
	} catch (err: unknown) {
		console.warn("[BackgroundLocation] stop failed:", err);
	}
}
