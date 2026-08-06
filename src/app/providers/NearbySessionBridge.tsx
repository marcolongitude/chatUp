import { useAuthSession } from "@/features/auth";
import { useNearbySession } from "@/features/location";

/**
 * Mantém GPS + snapshot nearby vivos no RootLayout (acima das tabs).
 * A lista de contatos só lê a store — sem remount / spinner ao trocar de tela.
 */
export function NearbySessionBridge() {
	const { user } = useAuthSession();
	useNearbySession(user?.id);
	return null;
}
