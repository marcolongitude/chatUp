import { useEffect } from "react";
import { useAuthSession } from "@/features/auth";
import { applyNearbyWsEvent, useNearbySession } from "@/features/location";
import { subscribeSocket } from "@/shared/lib/realtime/socket";

/**
 * Mantém GPS + snapshot nearby vivos no RootLayout (acima das tabs).
 * Aplica deltas WS `nearby.*` na mesma store (sem spinner / sem refetch full).
 */
export function NearbySessionBridge() {
	const { isAuthenticated, user } = useAuthSession();
	useNearbySession(user?.id);

	useEffect(() => {
		if (!isAuthenticated || !user?.id) return;

		let unsubscribe: (() => void) | undefined;
		let cancelled = false;

		void (async () => {
			const unsub = await subscribeSocket((event) => {
				if (!String(event.type ?? "").startsWith("nearby.")) return;
				applyNearbyWsEvent(event);
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
