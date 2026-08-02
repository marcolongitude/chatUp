import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

import { useLocation } from "./use-location";
import { usePerimeter } from "./use-perimeter";
import { fetchNearbyUsersApi } from "../api/nearby-users.api";
import { updateLocationApi } from "../api/update-location.api";

export const nearbyUsersQueryKeyRoot = ["nearbyUsers"] as const;
const LOCATION_UPDATE_THROTTLE_MS = 60_000;

/**
 * @param userId - ID do usuário autenticado (injetado pela camada superior)
 */
export function useNearbyUsers(userId: string | undefined) {
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

	useEffect(() => {
		if (!canFetch || !userLocation) return;
		const now = Date.now();
		if (now - lastLocationPushRef.current < LOCATION_UPDATE_THROTTLE_MS) return;
		lastLocationPushRef.current = now;
		updateLocationApi(userLocation.latitude, userLocation.longitude).catch((err: unknown) => {
			console.warn("Update location failed", err);
		});
	}, [canFetch, userLocation?.latitude, userLocation?.longitude]);

	const query = useQuery({
		queryKey: [
			...nearbyUsersQueryKeyRoot,
			userId,
			userLocation?.latitude,
			userLocation?.longitude,
			perimeterKm,
		],
		queryFn: async () => {
			if (!userLocation) return [];
			return fetchNearbyUsersApi({
				latitude: userLocation.latitude,
				longitude: userLocation.longitude,
				radius: perimeterKm,
			});
		},
		enabled: canFetch,
		staleTime: 2 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		refetchInterval: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		placeholderData: (previous) => previous,
	});

	// Unauthenticated state is handled by AuthGate (redirect to login).
	// Do not surface a stuck "Not authenticated" banner inside the main shell.
	let error: string | null = null;
	if (!userId) {
		error = null;
	} else if (locationError) {
		error = locationError;
	} else if (!isLocationLoading && !permissionGranted) {
		error = "No location permission";
	} else if (query.isError) {
		error = "Error fetching nearby users";
	}

	const isLoading =
		Boolean(userId) &&
		(isLocationLoading || !isPerimeterReady || (canFetch && query.isLoading && !query.data));

	return {
		nearbyUsers: query.data ?? [],
		isLoading,
		error,
		perimeterKm,
	};
}
