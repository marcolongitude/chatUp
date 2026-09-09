import { useEffect } from "react";
import { useAuthSession } from "@/features/auth";
import {
	applyNearbyWsEvent,
	ensureBackgroundLocationPermission,
	ensureLocationPermission,
	getNearbyStoreState,
	startBackgroundLocationTracking,
	stopBackgroundLocationTracking,
	useNearbySession,
} from "@/features/location";
import { subscribeSocket } from "@/shared/lib/realtime/socket";

/**
 * Mantém GPS + snapshot nearby vivos no RootLayout (acima das tabs).
 * Aplica deltas WS `nearby.*` na mesma store (sem spinner / sem refetch full).
 * Com sessão autenticada, sobe o tracking nativo (FGS) para perímetro em background.
 */
export function NearbySessionBridge() {
	const { isAuthenticated, user } = useAuthSession();
	useNearbySession(user?.id);

	useEffect(() => {
		if (!isAuthenticated || !user?.id) {
			void stopBackgroundLocationTracking();
			return;
		}

		let cancelled = false;
		void (async () => {
			const foreground = await ensureLocationPermission();
			if (cancelled || !foreground.granted) return;
			// Best-effort Always; FGS ainda ajuda no Android se o usuário negar Always.
			await ensureBackgroundLocationPermission();
			if (cancelled) return;
			await startBackgroundLocationTracking();
		})();

		return () => {
			cancelled = true;
			void stopBackgroundLocationTracking();
		};
	}, [isAuthenticated, user?.id]);

	useEffect(() => {
		if (!isAuthenticated || !user?.id) return;

		let unsubscribe: (() => void) | undefined;
		let cancelled = false;

		void (async () => {
			const unsub = await subscribeSocket((event) => {
				if (!String(event.type ?? "").startsWith("nearby.")) return;
				const allowDiscovery = getNearbyStoreState().permissionGranted === true;
				applyNearbyWsEvent(event, { allowDiscovery });
			});
			if (cancelled) {
				unsub();
				return;
			}
			unsubscribe = unsub;
		})();

		return () => {
			cancelled = true;
			unsubscribe?.();
		};
	}, [isAuthenticated, user?.id]);

	return null;
}
