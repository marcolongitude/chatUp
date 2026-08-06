import { useEffect, useRef } from "react";
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

export const nearbyUsersQueryKeyRoot = ["nearbyUsers"] as const;
const LOCATION_UPDATE_THROTTLE_MS = 60_000;

/** Arredonda coords na queryKey para evitar refetch por jitter do GPS. */
function roundCoord(value: number): number {
	return Math.round(value * 1e4) / 1e4;
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
	const lastUserIdRef = useRef<string | undefined>(undefined);

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
			setNearbyError("No location permission");
			setNearbyBootstrapping(false);
		}
	}, [userId, locationError, isLocationLoading, permissionGranted]);

	useEffect(() => {
		if (!canFetch || !userLocation) return;
		const now = Date.now();
		if (now - lastLocationPushRef.current < LOCATION_UPDATE_THROTTLE_MS) return;
		lastLocationPushRef.current = now;
		updateLocationApi(userLocation.latitude, userLocation.longitude).catch((err: unknown) => {
			console.warn("Update location failed", err);
		});
	}, [canFetch, userLocation?.latitude, userLocation?.longitude]);

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
		staleTime: 2 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		refetchInterval: 5 * 60 * 1000,
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
