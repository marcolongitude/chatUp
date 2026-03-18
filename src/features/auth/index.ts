import { useCreateProfile, useGoogleLogin, useLogin, useLogout, useSignup } from "./model";
import { useAuthSession } from "./model/use-auth-session";

export * from "./model";
export * from "./ui";

/**
 * Hook central de Auth (Facade)
 * Mantém compatibilidade com o código legado enquanto delega para novas features FSD.
 */
export function useAuth() {
  const session = useAuthSession();
  const { login, isLoading: isLoginLoading, error: loginError } = useLogin();
  const { signInWithGoogle, isLoading: isGoogleLoading, error: googleError } = useGoogleLogin();
  const { signup, isLoading: isSignupLoading, error: signupError } = useSignup();
  const { logout } = useLogout();
  const { createProfile, isLoading: isProfileLoading, error: profileError } = useCreateProfile();

  return {
    ...session,
    login,
    signup,
    logout,
    createProfile,
    isLoading: session.isLoading || isLoginLoading || isGoogleLoading || isSignupLoading || isProfileLoading,
    error: loginError || googleError || signupError || profileError || null,
    // Compatibilidade com nomes antigos
    isAuthenticated: session.isAuthenticated,
    hasCompleteProfile: session.isAuthenticated,
    signIn: login,
    signUp: signup,
    signInWithGoogle,
    syncPhotoURL: async () => {},
    refreshProfile: async () => {},
  };
}
