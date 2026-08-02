import { useState } from "react";

import { loginApi } from "../api/login.api";
import { initializeCrypto } from "../lib/crypto-init";
import { AuthUser, useAuthSession } from "./use-auth-session";

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
        displayName: response.user.displayName || response.user.name || null,
        photoURL: response.user.photoURL || null,
        getIdToken: async () => response.token,
      };

      await setSession(response.token, backendUser, {
        id: backendUser.id,
        email: backendUser.email || "",
        displayName: backendUser.displayName || "",
        hasProfile: true,
      });

      try {
        await initializeCrypto(backendUser.id);
      } catch (cryptoError) {
        console.warn("[Auth] Crypto init after login failed", cryptoError);
      }
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    login,
    isLoading,
    error,
  };
}
