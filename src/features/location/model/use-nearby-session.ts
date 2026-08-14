import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { fetchNearbyUsersApi } from "../api/nearby-users.api";
import { updateLocationApi } from "../api/update-location.api";
import { buildNearbySnapshot } from "./nearby-reducer";
import {
	replaceNearbySnapshot,
	resetNearbyStore,
	setNearbyBootstrapping,
	setNearbyError,
	setNearbyPermissionGranted,
	setNearbyRefreshing,
	getNearbyStoreState,
} from "./nearby-store";
import { useLocation } from "./use-location";
import { usePerimeter } from "./use-perimeter";
import { sendSocketEvent } from "@/shared/lib/realtime/socket";

export const nearbyUsersQueryKeyRoot = ["nearbyUsers"] as const;

/**
 * Throttle mínimo entre PUTs por movimento significativo.
 * Liveness (não sumir da lista) vai por WS presence.ping — não por HTTP.
 */
const LOCATION_MOVE_MIN_INTERVAL_MS = 5_000;
/** Só faz PUT se andou ≥ isto (metros) ou se for force (foreground / 1º fetch). */
const LOCATION_MOVE_THRESHOLD_M = 25;
/**
 * Presença no socket já aberto. Com LOCATION_STALE=15m no server,
 * ~2m deixa folga larga sem enxurrada HTTP. Jitter evita thundering herd.
 */
const PRESENCE_PING_BASE_MS = 120_000;
const PRESENCE_PING_JITTER_MS = 30_000;
/** HTTP nearby é backup; deltas WS cobrem o tempo real. */
const NEARBY_HTTP_REFETCH_MS = 120_000;

/** Arredonda coords na queryKey para evitar refetch por jitter do GPS. */
function roundCoord(value: number): number {
	return Math.round(value * 1e4) / 1e4;
}

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
 * Mantém a NearbyStore sincronizada com HTTP enquanto a sessão autenticada vive.
 * Deve montar acima das tabs (RootLayout) para não remountar ao trocar de tela.
 */
export function useNearbySession(userId: string | undefined): void {
	const {
		location: userLocation,
		permissionStatus,
		isLoading: isLocationLoading,
		error: locationError,
	} = useLocation();
	const { perimeterKm, isReady: isPerimeterReady } = usePerimeter();

	const permissionGranted = Boolean(permissionStatus?.granted);
	const canFetch =
		Boolean(userId) &&
		permissionGranted &&
		!isLocationLoading &&
		!locationError &&
		Boolean(userLocation) &&
		isPerimeterReady;

	const lastLocationPushRef = useRef(0);
	const lastPushedCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null);
	const lastUserIdRef = useRef<string | undefined>(undefined);
	const wasCanFetchRef = useRef(false);
	const locationCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null);
	locationCoordsRef.current = userLocation
		? { latitude: userLocation.latitude, longitude: userLocation.longitude }
		: null;

	useEffect(() => {
		if (!userId) {
			resetNearbyStore();
			lastUserIdRef.current = undefined;
			return;
		}
		if (lastUserIdRef.current !== userId) {
			lastUserIdRef.current = userId;
			const hadCache = getNearbyStoreState().snapshot?.observerId === userId;
			if (!hadCache) {
				setNearbyBootstrapping(true);
			}
		}
	}, [userId]);

	useEffect(() => {
		setNearbyPermissionGranted(permissionStatus ? permissionGranted : null);
	}, [permissionGranted, permissionStatus]);

	useEffect(() => {
		if (!userId) return;
		if (locationError) {
			setNearbyError(locationError);
			setNearbyBootstrapping(false);
			return;
		}
		if (!isLocationLoading && !permissionGranted) {
			setNearbyError("Permissão de localização negada.");
			setNearbyBootstrapping(false);
			return;
		}
		if (permissionGranted && !locationError) {
			const currentError = getNearbyStoreState().error;
			if (
				currentError &&
				(currentError.includes("permissão") ||
					currentError.includes("permission") ||
					currentError.includes("localização negada") ||
					currentError.includes("No location"))
			) {
				setNearbyError(null);
			}
		}
	}, [userId, locationError, isLocationLoading, permissionGranted]);

	useEffect(() => {
		if (!canFetch || !userLocation) {
			wasCanFetchRef.current = false;
			return;
		}
		const forcePush = !wasCanFetchRef.current;
		wasCanFetchRef.current = true;
		const now = Date.now();
		const prev = lastPushedCoordsRef.current;
		const movedM = prev
			? haversineMeters(prev.latitude, prev.longitude, userLocation.latitude, userLocation.longitude)
			: Number.POSITIVE_INFINITY;
		const significantMove = movedM >= LOCATION_MOVE_THRESHOLD_M;

		if (!forcePush && !significantMove) return;
		if (!forcePush && now - lastLocationPushRef.current < LOCATION_MOVE_MIN_INTERVAL_MS) return;

		lastLocationPushRef.current = now;
		lastPushedCoordsRef.current = {
			latitude: userLocation.latitude,
			longitude: userLocation.longitude,
		};
		updateLocationApi(userLocation.latitude, userLocation.longitude).catch((err: unknown) => {
			console.warn("Update location failed", err);
		});
	}, [canFetch, userLocation?.latitude, userLocation?.longitude]);

	// Liveness via WS (reusa conexão). Sem HTTP heartbeat.
	useEffect(() => {
		if (!canFetch) return;

		let timeoutId: ReturnType<typeof setTimeout> | null = null;
		let cancelled = false;

		const scheduleNext = () => {
			const delay = PRESENCE_PING_BASE_MS + Math.floor(Math.random() * PRESENCE_PING_JITTER_MS);
			timeoutId = setTimeout(() => {
				if (cancelled) return;
				sendSocketEvent("presence.ping", {});
				scheduleNext();
			}, delay);
		};

		sendSocketEvent("presence.ping", {});
		scheduleNext();

		const onAppState = (next: AppStateStatus) => {
			if (next !== "active") return;
			sendSocketEvent("presence.ping", {});
			const coords = locationCoordsRef.current;
			if (!coords) return;
			// Foreground: um PUT real de GPS (posição pode ter mudado em background).
			lastLocationPushRef.current = Date.now();
			lastPushedCoordsRef.current = coords;
			updateLocationApi(coords.latitude, coords.longitude).catch((err: unknown) => {
				console.warn("Foreground location push failed", err);
			});
		};
		const sub = AppState.addEventListener("change", onAppState);
		return () => {
			cancelled = true;
			if (timeoutId) clearTimeout(timeoutId);
			sub.remove();
		};
	}, [canFetch]);

	const latKey = userLocation ? roundCoord(userLocation.latitude) : undefined;
	const lngKey = userLocation ? roundCoord(userLocation.longitude) : undefined;

	const query = useQuery({
		queryKey: [...nearbyUsersQueryKeyRoot, userId, latKey, lngKey, perimeterKm],
		queryFn: async () => {
			if (!userLocation || !userId) return null;
			const users = await fetchNearbyUsersApi({
				latitude: userLocation.latitude,
				longitude: userLocation.longitude,
				radius: perimeterKm,
			});
			return buildNearbySnapshot({
				observerId: userId,
				perimeterKm,
				users,
			});
		},
		enabled: canFetch,
		staleTime: NEARBY_HTTP_REFETCH_MS,
		gcTime: 10 * 60 * 1000,
		refetchInterval: NEARBY_HTTP_REFETCH_MS,
		refetchOnWindowFocus: false,
		placeholderData: (previous) => previous,
	});

	useEffect(() => {
		if (!userId) return;

		const hasSnapshot = getNearbyStoreState().snapshot?.observerId === userId;
		if (query.isFetching) {
			if (hasSnapshot) setNearbyRefreshing(true);
			else setNearbyBootstrapping(true);
		} else {
			setNearbyRefreshing(false);
		}

		if (query.data) {
			replaceNearbySnapshot(query.data);
		} else if (query.isError) {
			setNearbyError("Error fetching nearby users");
			setNearbyBootstrapping(false);
			setNearbyRefreshing(false);
		}
	}, [userId, query.data, query.isFetching, query.isError]);
}
