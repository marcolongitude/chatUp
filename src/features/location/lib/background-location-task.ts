import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

import { updateLocationApi } from "../api/update-location.api";

/** Nome estável da task — deve bater com startLocationUpdatesAsync. */
export const BACKGROUND_LOCATION_TASK = "chatup-background-location";

/** Intervalo mínimo entre PUTs no background (anti-enxurrada). */
const BG_PUT_MIN_INTERVAL_MS = 45_000;
/** Só reenvia se andou pelo menos isto (metros), salvo se o intervalo mínimo passou. */
const BG_PUT_MIN_MOVE_M = 25;

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
	const dueByTime = now - lastBgPushAt >= BG_PUT_MIN_INTERVAL_MS;
	const dueByMove = movedM >= BG_PUT_MIN_MOVE_M;

	if (!(dueByTime || dueByMove)) return;

	lastBgPushAt = now;
	lastBgCoords = { latitude, longitude };

	try {
		await updateLocationApi(latitude, longitude);
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
export async function startBackgroundLocationTracking(): Promise<boolean> {
	try {
		const foreground = await Location.getForegroundPermissionsAsync();
		if (foreground.status !== "granted") return false;

		const servicesOn = await Location.hasServicesEnabledAsync();
		if (!servicesOn) return false;

		const already = await isBackgroundLocationRunning();
		if (already) return true;

		await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
			accuracy: Location.Accuracy.Balanced,
			timeInterval: 60_000,
			distanceInterval: BG_PUT_MIN_MOVE_M,
			deferredUpdatesInterval: 60_000,
			deferredUpdatesDistance: BG_PUT_MIN_MOVE_M,
			showsBackgroundLocationIndicator: true,
			pausesUpdatesAutomatically: false,
			foregroundService: {
				notificationTitle: "ChatUp",
				notificationBody: "Monitorando proximidade com contatos próximos.",
				notificationColor: "#5b9bd5",
			},
		});
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
