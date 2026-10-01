/**
 * Ponte entre NearbySessionBridge (dono do useLocation) e UI (Conversas / Configurações),
 * sem montar um segundo watcher de GPS.
 */

type LocationSessionActions = {
	requestPermission: () => Promise<boolean>;
	refreshLocation: () => Promise<void>;
	openSettings: () => Promise<void>;
};

let actions: LocationSessionActions | null = null;
const listeners = new Set<() => void>();

export function registerLocationSessionActions(next: LocationSessionActions | null): void {
	actions = next;
	listeners.forEach((l) => l());
}

export function subscribeLocationSessionActions(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function getLocationSessionActions(): LocationSessionActions | null {
	return actions;
}

export async function requestSessionLocationPermission(): Promise<boolean> {
	if (actions) return actions.requestPermission();
	const {
		ensureBackgroundLocationPermission,
		ensureLocationPermission,
	} = await import("../lib/ensure-location-permission");
	const { startBackgroundLocationTracking } = await import("../lib/background-location-task");
	const result = await ensureLocationPermission();
	if (result.granted) {
		await ensureBackgroundLocationPermission();
		await startBackgroundLocationTracking();
	}
	return result.granted;
}

export async function refreshSessionLocation(): Promise<void> {
	if (actions) {
		await actions.refreshLocation();
		return;
	}
}

export async function openSessionLocationSettings(): Promise<void> {
	if (actions) {
		await actions.openSettings();
		return;
	}
	const { openAppSystemSettings } = await import("../lib/ensure-location-permission");
	await openAppSystemSettings();
}
