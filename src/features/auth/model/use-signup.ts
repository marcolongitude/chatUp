import { useState } from "react";

import { signupApi } from "../api/signup.api";
import { useLogin } from "./use-login";

export function useSignup() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useLogin();

  const signup = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await signupApi({ email, password, name });
      return await login(email, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Register failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    signup,
    isLoading,
    error,
  };
}
