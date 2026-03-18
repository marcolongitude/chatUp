import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "@tanstack/react-router";
import { useAuth } from "@/features/auth";
import { useLocation, useNearbyUsers } from "@/features/location";
import { useContacts } from "@/entities/contact";
import { axiosInstance } from "@/shared/api";
import { ensureStableSession } from "@/shared/lib/crypto";

export function useContactList() {
	const router = useRouter();
	const { user } = useAuth();
	
	const { openSettings, permissionStatus } = useLocation();
	const { nearbyUsers, isLoading: isLoadingNearby, error: nearbyError } = useNearbyUsers(user?.id);
	const { contacts, isLoading: isLoadingContacts } = useContacts(nearbyUsers, user?.id);

	const [searchQuery, setSearchQuery] = useState("");
	const [searchPromise, setSearchPromise] = useState<Promise<any[]> | null>(null);

	const isLoading = isLoadingNearby || isLoadingContacts;
	
	const isLocationPermissionError = Boolean(
		nearbyError &&
			(nearbyError.includes("localização") ||
				nearbyError.includes("permissão") ||
				nearbyError.includes("Localização") ||
				!permissionStatus?.granted)
	);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (searchQuery.length >= 2) {
				const promise = axiosInstance.get(`/users/search`, {
					params: { q: searchQuery }
				}).then(res => res.data);
				setSearchPromise(promise);
			} else {
				setSearchPromise(null);
			}
		}, 500);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	const handleContactPress = useCallback((contactId: string, name?: string, avatar?: string) => {
		if (user) {
			ensureStableSession(user.id, contactId).catch(() => {});
		}

		router.navigate({
			to: "/chat/$chatId",
			params: { chatId: contactId },
			search: { initialName: name, initialAvatar: avatar }
		} as any);
	}, [user, router]);

	const isSearchingMode = searchQuery.length >= 2;

	return {
		user,
		contacts,
		isLoading,
		searchQuery,
		setSearchQuery,
		searchPromise,
		nearbyError,
		isLocationPermissionError,
		isSearchingMode,
		openSettings,
		handleContactPress,
	};
}
