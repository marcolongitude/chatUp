import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

import { googleLoginApi } from "../api/google-login.api";
import { initializeCrypto } from "../lib/crypto-init";
import { AuthUser, useAuthSession } from "./use-auth-session";

WebBrowser.maybeCompleteAuthSession();

const buildNativeRedirectUri = (clientId: string) => `com.googleusercontent.apps.${clientId}:/oauthredirect`;

const buildRedirectUri = (nativeRedirectUri?: string, useProxy?: boolean) =>
  AuthSession.makeRedirectUri({
    native: nativeRedirectUri,
    useProxy,
  });

export function useGoogleLogin() {
  const { setSession } = useAuthSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientIds = useMemo(
    () => ({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    }),
    []
  );

  const nativeRedirectUri = useMemo(() => {
    if (Platform.OS === "android" && clientIds.androidClientId) {
      return buildNativeRedirectUri(clientIds.androidClientId);
    }

    if (Platform.OS === "ios" && clientIds.iosClientId) {
      return buildNativeRedirectUri(clientIds.iosClientId);
    }

    return undefined;
  }, [clientIds.androidClientId, clientIds.iosClientId]);

  const useProxy = !nativeRedirectUri;
  const redirectUri = useMemo(() => buildRedirectUri(nativeRedirectUri, useProxy), [nativeRedirectUri, useProxy]);

  const [, response, promptAsync] = Google.useAuthRequest({
    ...clientIds,
    redirectUri,
    scopes: ["profile", "email"],
  });

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

      await setSession(authResponse.token, backendUser, {
        id: backendUser.id,
        email: backendUser.email || "",
        displayName: backendUser.displayName || "",
        hasProfile: true,
        photoURL: backendUser.photoURL || undefined,
      });

      await initializeCrypto(backendUser.id);
    },
    [setSession]
  );

  useEffect(() => {
    if (!response || response.type !== "success") {
      return;
    }

    const idToken =
      response.authentication?.idToken ?? (response.params?.id_token ? response.params.id_token : undefined);

    if (!idToken) {
      setError("auth.googleSignInFailed");
      return;
    }

    setIsLoading(true);
    setError(null);

    completeLogin(idToken)
      .catch((err: Error) => {
        setError(err.message || "auth.googleSignInFailed");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [response, completeLogin]);

  const signInWithGoogle = useCallback(async () => {
    if (!clientIds.webClientId && !clientIds.iosClientId && !clientIds.androidClientId) {
      setError("auth.googleClientIdMissing");
      return;
    }

    setError(null);
    await promptAsync({ useProxy });
  }, [clientIds.androidClientId, clientIds.iosClientId, clientIds.webClientId, promptAsync, useProxy]);

  return {
    signInWithGoogle,
    isLoading,
    error,
  };
}
