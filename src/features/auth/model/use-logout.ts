import { logoutApi } from "../api/logout.api";
import { cleanupAuthData } from "../lib/cleanup";
import { useAuthSession } from "./use-auth-session";

export function useLogout() {
  const { clearSession, user } = useAuthSession();

  const logout = async () => {
    const userId = user?.id;
    try {
      await logoutApi();
    } catch (error) {
      console.warn("[Feature/Auth] Remote logout failed; clearing local session anyway", error);
    }

    try {
      await cleanupAuthData(userId);
    } catch (error) {
      console.warn("[Feature/Auth] Cleanup failed", error);
    }

    await clearSession();
  };

  return {
    logout,
  };
}
