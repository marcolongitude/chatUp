import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import { googleLoginApi } from "../api/google-login.api";
import { initializeCrypto } from "../lib/crypto-init";
import { AuthUser, useAuthSession } from "./use-auth-session";

const DEFAULT_WEB_CLIENT_ID =
  "510679848324-uicijmb0d26ebf3rlo0qil5pjuk9d1ea.apps.googleusercontent.com";

function configureGoogleSignIn(): string {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || DEFAULT_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

  GoogleSignin.configure({
    webClientId,
    iosClientId: iosClientId || undefined,
    offlineAccess: false,
    scopes: ["profile", "email"],
  });

  return webClientId;
}

function mapGoogleSignInError(err: unknown): string {
  if (isErrorWithCode(err)) {
    if (err.code === statusCodes.SIGN_IN_CANCELLED || err.code === statusCodes.IN_PROGRESS) {
      return "";
    }
    if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return "auth.googleSignInFailed";
    }
    // Android ApiException: 10 = DEVELOPER_ERROR (SHA-1 / package mismatch)
    if (err.code === "10" || /DEVELOPER_ERROR/i.test(err.message || "")) {
      return "auth.googleSignInConfigError";
    }
  }

  if (err instanceof Error && /Network Error|timeout|ECONNABORTED/i.test(err.message)) {
    return "errors.network";
  }

  if (err instanceof Error && /401|invalid token|Unauthorized/i.test(err.message)) {
    return "auth.googleSignInFailed";
  }

  return err instanceof Error && err.message ? err.message : "auth.googleSignInFailed";
}

export function useGoogleLogin() {
  const { setSession } = useAuthSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }
    try {
      configureGoogleSignIn();
    } catch (configureError) {
      console.warn("[Auth] Google Sign-In configure failed", configureError);
    }
  }, []);

  const completeLogin = useCallback(
    async (idToken: string) => {
      const authResponse = await googleLoginApi({ idToken });

      const backendUser: AuthUser = {
        id: authResponse.user.id,
        email: authResponse.user.email,
        displayName: authResponse.user.displayName || authResponse.user.name || null,
        photoURL: authResponse.user.photoURL || null,
        getIdToken: async () => authResponse.token,
      };

      await setSession(
        authResponse.token,
        backendUser,
        {
          id: backendUser.id,
          email: backendUser.email || "",
          displayName: backendUser.displayName || "",
          hasProfile: true,
          photoURL: backendUser.photoURL || undefined,
        },
        authResponse.refreshToken
      );

      try {
        await initializeCrypto(backendUser.id);
      } catch (cryptoError) {
        console.warn("[Auth] Crypto init after Google login failed", cryptoError);
      }
    },
    [setSession]
  );

  const signInWithGoogle = useCallback(async () => {
    if (Platform.OS === "web") {
      setError("auth.googleSignInFailed");
      return;
    }

    if (inFlightRef.current) {
      return;
    }

    const webClientId = configureGoogleSignIn();
    if (!webClientId) {
      setError("auth.googleClientIdMissing");
      return;
    }

    inFlightRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      if (Platform.OS === "android") {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }

      // Clear previous session so account picker always returns a fresh idToken.
      try {
        await GoogleSignin.signOut();
      } catch {
        // ignore: no previous session
      }

      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) {
        return;
      }

      let idToken = response.data.idToken;
      if (!idToken) {
        const tokens = await GoogleSignin.getTokens();
        idToken = tokens.idToken;
      }
      if (!idToken) {
        console.warn("[Auth] Google Sign-In succeeded without idToken");
        setError("auth.googleSignInFailed");
        return;
      }

      await completeLogin(idToken);
    } catch (err: unknown) {
      const mapped = mapGoogleSignInError(err);
      if (!mapped) {
        return;
      }
      console.warn("[Auth] Google Sign-In failed", err);
      setError(mapped);
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
    }
  }, [completeLogin]);

  return {
    signInWithGoogle,
    isLoading,
    error,
  };
}
