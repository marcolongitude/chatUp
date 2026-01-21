import { useAuthSession } from "../../model/use-auth-session";

/**
 * Hook para a funcionalidade de Logout
 */
export function useLogout() {
  const { clearSession } = useAuthSession();

  const logout = async () => {
    try {
      await clearSession();
    } catch (e) {
      console.error("[Feature/Logout] Failed to clear session", e);
    }
  };

  return {
    logout
  };
}
