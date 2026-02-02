import { useState } from "react";
import { loginApi } from "../api/login.api";
import { initializeCrypto } from "../lib/crypto-init";
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
      const response = await loginApi({ email, password });
      
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
      await initializeCrypto(backendUser.id);

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
