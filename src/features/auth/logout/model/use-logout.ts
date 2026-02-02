import { useAuthSession } from "../../model/use-auth-session";
import { logoutApi } from "../api/logout.api";
import { cleanupAuthData } from "../lib/cleanup";

/**
 * Hook para a funcionalidade de Logout
 */
export function useLogout() {
  const { clearSession } = useAuthSession();

  const logout = async () => {
    try {
      // Chama API de logout (se implementada no backend)
      await logoutApi();
      // Limpa dados locais
      await cleanupAuthData();
      // Limpa sessão do contexto
      await clearSession();
    } catch (e) {
      console.error("[Feature/Logout] Failed to logout", e);
    }
  };

  return {
    logout
  };
}
