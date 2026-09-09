import { useMemo, useSyncExternalStore } from "react";

import type { NearbyContact } from "./nearby-contract";
import { getNearbyStoreState, subscribeNearbyStore } from "./nearby-store";

export function useNearbyStore() {
	return useSyncExternalStore(subscribeNearbyStore, getNearbyStoreState, getNearbyStoreState);
}

export function useNearbyLists() {
	const state = useNearbyStore();

	const family = state.snapshot?.family ?? [];
	const discovery = state.snapshot?.discovery ?? [];
	const perimeterKm = state.snapshot?.perimeterKm ?? 1;
	const hasSnapshot = Boolean(state.snapshot);

	const isLoading = state.isBootstrapping && !hasSnapshot;
	const isRefreshing = state.isRefreshing;

	const flatContacts = useMemo(() => {
		const mapRow = (c: NearbyContact) => ({
			id: c.id,
			name: c.name,
			avatar: c.avatar,
			unreadCount: 0,
			queue: c.queue,
			inGrace: Boolean(c.inGrace),
			locationVisible: Boolean(c.locationVisible),
		});
		return {
			family: family.map(mapRow),
			discovery: discovery.map(mapRow),
		};
	}, [family, discovery]);

	return {
		familyContacts: flatContacts.family,
		discoveryContacts: flatContacts.discovery,
		isLoading,
		isRefreshing,
		error: state.error,
		perimeterKm,
		permissionGranted: state.permissionGranted,
		hasSnapshot,
	};
}
