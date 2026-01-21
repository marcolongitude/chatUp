import { useState } from "react";
import { authService } from "@/services/api/auth.service";
import { getOrCreateKeyPair } from "@/shared/lib/crypto";
import { bootstrapSignalAccount } from "@/shared/lib/crypto/signal";
import { useAuthSession, AuthUser } from "../../model/use-auth-session";

/**
 * Hook para a funcionalidade de Login
 */
export function useLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setSession } = useAuthSession();

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login({ email, password });
      
      const backendUser: AuthUser = {
        id: response.user.id,
        email: response.user.email,
        displayName: response.user.name,
        photoURL: null,
        getIdToken: async () => response.token,
      };

      await setSession(response.token, backendUser, {
         id: backendUser.id,
         email: backendUser.email || "",
         displayName: backendUser.displayName || "",
         hasProfile: true,
      });

      // Initialize Crypto
      try {
          await getOrCreateKeyPair(backendUser.id);
          await bootstrapSignalAccount(backendUser.id);
      } catch(e) {
          console.warn("[Feature/Login] Crypto init failed", e);
      }

      return response;
    } catch (err: any) {
      const msg = err.message || "Login failed";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    login,
    isLoading,
    error
  };
}
