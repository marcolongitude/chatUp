import { useState, useEffect, useCallback } from "react";
import { useRouter } from "@tanstack/react-router";
import { useAuth } from "@/features/auth";
import {
	useNearbyLists,
	requestSessionLocationPermission,
	openSessionLocationSettings,
	refreshSessionLocation,
} from "@/features/location";

import { axiosInstance } from "@/shared/api";

export function useContactList() {
	const router = useRouter();
	const { user } = useAuth();

	const {
		familyContacts,
		discoveryContacts,
		isLoading,
		isRefreshing,
		error: nearbyError,
		perimeterKm,
		permissionGranted,
	} = useNearbyLists();

	const [searchQuery, setSearchQuery] = useState("");
	const [searchPromise, setSearchPromise] = useState<Promise<unknown[]> | null>(null);
	const [isRequestingPermission, setIsRequestingPermission] = useState(false);

	const needsLocationPermission = permissionGranted === false;

	const isLocationPermissionError =
		needsLocationPermission ||
		Boolean(
			nearbyError &&
				(nearbyError.includes("localização") ||
					nearbyError.includes("permissão") ||
					nearbyError.includes("Localização") ||
					nearbyError.includes("location") ||
					nearbyError.includes("permission"))
		);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (searchQuery.length >= 2) {
				const promise = axiosInstance
					.get(`/users/search`, {
						params: { q: searchQuery },
					})
					.then((res) => res.data as unknown[]);
				setSearchPromise(promise);
			} else {
				setSearchPromise(null);
			}
		}, 500);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	const handleContactPress = useCallback(
		(contactId: string, name?: string, avatar?: string) => {
			router.navigate({
				to: "/chat/$chatId",
				params: { chatId: contactId },
				search: { initialName: name, initialAvatar: avatar },
			} as never);
		},
		[router]
	);

	const handleEnableLocation = useCallback(async () => {
		setIsRequestingPermission(true);
		try {
			const granted = await requestSessionLocationPermission();
			if (granted) {
				await refreshSessionLocation();
				return;
			}
			await openSessionLocationSettings();
		} finally {
			setIsRequestingPermission(false);
		}
	}, []);

	const isSearchingMode = searchQuery.length >= 2;
	const isEmpty = familyContacts.length === 0 && discoveryContacts.length === 0;

	return {
		user,
		familyContacts,
		discoveryContacts,
		isEmpty,
		isLoading,
		isRefreshing,
		searchQuery,
		setSearchQuery,
		searchPromise,
		nearbyError,
		isLocationPermissionError,
		needsLocationPermission,
		isRequestingPermission,
		isSearchingMode,
		perimeterKm,
		handleEnableLocation,
		openSettings: openSessionLocationSettings,
		handleContactPress,
	};
}
