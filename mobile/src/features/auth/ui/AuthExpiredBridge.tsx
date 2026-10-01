import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

import { onAuthExpired } from "@/shared/api";
import { cleanupAuthData } from "../lib/cleanup";
import { useAuthSession } from "../model/use-auth-session";

/**
 * Clears local session and sends the user to login when the API returns 401.
 */
export function AuthExpiredBridge() {
	const router = useRouter();
	const { clearSession, user } = useAuthSession();

	useEffect(() => {
		return onAuthExpired(() => {
			void (async () => {
				const userId = user?.id;
				try {
					await cleanupAuthData(userId);
				} catch {
					// ignore
				}
				await clearSession();
				router.navigate({ to: "/auth/login", replace: true });
			})();
		});
	}, [clearSession, user?.id, router]);

	return null;
}
