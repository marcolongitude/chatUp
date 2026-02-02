import { useState } from "react";
import { signupApi } from "../api/signup.api";
import { useLogin } from "../../login/model/use-login";

/**
 * Hook para a funcionalidade de Signup (Cadastro)
 */
export function useSignup() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useLogin();

  const signup = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await signupApi({ email, password, name });
      
      // Auto-login after register
      return await login(email, password);
    } catch (err: any) {
      const msg = err.message || "Register failed";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    signup,
    isLoading,
    error
  };
}
