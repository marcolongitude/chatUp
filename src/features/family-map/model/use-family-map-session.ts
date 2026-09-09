import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthSession } from "@/features/auth";
import { subscribeSocket } from "@/shared/lib/realtime/socket";
import { getFamilyMapApi } from "../api/family-map.api";
import type { FamilyMapMember, FamilyMapSnapshot } from "./types";

export const familyMapQueryKey = ["familyMap"] as const;

function applyMapUpdated(
	prev: FamilyMapSnapshot | undefined,
	payload: Record<string, unknown>,
): FamilyMapSnapshot | undefined {
	if (!prev) return prev;
	const peerId = String(payload.peerId ?? "");
	if (!peerId) return prev;
	const members = prev.members.map((m) => {
		if (m.peerId !== peerId) return m;
		const locationVisible = Boolean(payload.locationVisible);
		const next: FamilyMapMember = {
			...m,
			inPerimeter: Boolean(payload.inPerimeter),
			locationVisible,
			distanceM: typeof payload.distanceM === "number" ? payload.distanceM : m.distanceM,
			locationUpdatedAt:
				typeof payload.updatedAt === "string" ? payload.updatedAt : m.locationUpdatedAt,
		};
		if (locationVisible && typeof payload.latitude === "number" && typeof payload.longitude === "number") {
			next.latitude = payload.latitude;
			next.longitude = payload.longitude;
			next.inGrace = false;
		} else {
			next.latitude = undefined;
			next.longitude = undefined;
		}
		return next;
	});
	return { ...prev, members };
}

function applyMapSync(payload: Record<string, unknown>): FamilyMapSnapshot | undefined {
	const chefId = String(payload.chefId ?? "");
	const perimeterKm = typeof payload.perimeterKm === "number" ? payload.perimeterKm : 1;
	const rawMembers = Array.isArray(payload.members) ? payload.members : [];
	const members: FamilyMapMember[] = rawMembers.map((item) => {
		const row = item as Record<string, unknown>;
		const locationVisible = Boolean(row.locationVisible);
		return {
			linkId: String(row.linkId ?? ""),
			peerId: String(row.peerId ?? ""),
			peerName: String(row.peerName ?? ""),
			peerAvatar: typeof row.peerAvatar === "string" ? row.peerAvatar : undefined,
			mapTrackingActive: Boolean(row.mapTrackingActive),
			locationVisible,
			inPerimeter: Boolean(row.inPerimeter),
			inGrace: Boolean(row.inGrace),
			latitude: locationVisible && typeof row.latitude === "number" ? row.latitude : undefined,
			longitude: locationVisible && typeof row.longitude === "number" ? row.longitude : undefined,
			locationUpdatedAt: typeof row.locationUpdatedAt === "string" ? row.locationUpdatedAt : undefined,
			distanceM: typeof row.distanceM === "number" ? row.distanceM : undefined,
		};
	});
	return { chefId, perimeterKm, members };
}

export function useFamilyMapSession() {
	const { isAuthenticated } = useAuthSession();
	const queryClient = useQueryClient();
	const [forbidden, setForbidden] = useState(false);

	const query = useQuery({
		queryKey: familyMapQueryKey,
		queryFn: async () => {
			try {
				const snap = await getFamilyMapApi();
				setForbidden(false);
				return snap;
			} catch (err: unknown) {
				const status = (err as { response?: { status?: number } })?.response?.status;
				if (status === 403) {
					setForbidden(true);
				}
				throw err;
			}
		},
		enabled: isAuthenticated,
		staleTime: 1000 * 15,
		retry: (failureCount, err) => {
			const status = (err as { response?: { status?: number } })?.response?.status;
			if (status === 403) return false;
			return failureCount < 2;
		},
	});

	const onSocketEvent = useCallback(
		(event: { type?: string; data?: unknown }) => {
			if (event.type === "family.map.sync" && event.data && typeof event.data === "object") {
				const snap = applyMapSync(event.data as Record<string, unknown>);
				if (snap) {
					queryClient.setQueryData(familyMapQueryKey, snap);
					setForbidden(false);
				}
				return;
			}
			if (event.type === "family.map.updated" && event.data && typeof event.data === "object") {
				queryClient.setQueryData(familyMapQueryKey, (prev: FamilyMapSnapshot | undefined) =>
					applyMapUpdated(prev, event.data as Record<string, unknown>),
				);
			}
		},
		[queryClient],
	);

	useEffect(() => {
		if (!isAuthenticated) return;
		let unsub: (() => void) | undefined;
		void (async () => {
			unsub = await subscribeSocket(onSocketEvent);
		})();
		return () => {
			unsub?.();
		};
	}, [isAuthenticated, onSocketEvent]);

	return {
		snapshot: query.data,
		members: query.data?.members ?? [],
		perimeterKm: query.data?.perimeterKm ?? 1,
		isLoading: query.isLoading,
		isError: query.isError,
		forbidden,
		refetch: query.refetch,
	};
}
