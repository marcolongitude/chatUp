import { logoutApi } from "../api/logout.api";
import { cleanupAuthData } from "../lib/cleanup";
import { useAuthSession } from "./use-auth-session";

export function useLogout() {
  const { clearSession } = useAuthSession();

  const logout = async () => {
    try {
      await logoutApi();
      await cleanupAuthData();
      await clearSession();
    } catch (error) {
      console.error("[Feature/Auth] Failed to logout", error);
    }
  };

  return {
    logout,
  };
}
