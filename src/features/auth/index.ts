import { useAuthSession } from './model/use-auth-session';
import { useLogin } from './login';
import { useSignup } from './signup';
import { useLogout } from './logout';
import { useCreateProfile } from './create-profile';

/**
 * Hook central de Auth (Facade)
 * Mantém compatibilidade com o código legado enquanto delega para novas features FSD.
 */
export function useAuth() {
  const session = useAuthSession();
  const { login, isLoading: isLoginLoading, error: loginError } = useLogin();
  const { signup, isLoading: isSignupLoading, error: signupError } = useSignup();
  const { logout } = useLogout();
  const { createProfile, isLoading: isProfileLoading, error: profileError } = useCreateProfile();

  return {
    ...session,
    login,
    signup,
    logout,
    createProfile,
    isLoading: session.isLoading || isLoginLoading || isSignupLoading || isProfileLoading,
    error: loginError || signupError || profileError || null,
    // Compatibilidade com nomes antigos
    isAuthenticated: session.isAuthenticated,
    hasCompleteProfile: session.isAuthenticated, // Simplificado
    signIn: login,
    signUp: signup,
    signInWithGoogle: async () => { console.warn("Google Sign-In not implemented"); },
    syncPhotoURL: async () => {},
    refreshProfile: async () => {},
  };
}

export * from './model/types';
export * from './model/use-auth-session';
export { LoginForm } from './login';
export { SignUpForm } from './signup';
export { CreateProfileForm } from './create-profile';
