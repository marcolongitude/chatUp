import { logoutApi } from "../api/logout.api";
import { cleanupAuthData } from "../lib/cleanup";
import { useAuthSession } from "./use-auth-session";

export function useLogout() {
  const { clearSession, user } = useAuthSession();

  const logout = async () => {
    try {
      await logoutApi();
      await cleanupAuthData(user?.id);
      await clearSession();
    } catch (error) {
      console.error("[Feature/Auth] Failed to logout", error);
    }
  };

  return {
    logout,
  };
}
