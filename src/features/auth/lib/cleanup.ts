import AsyncStorage from "@react-native-async-storage/async-storage";
import { StableLibSessionManager } from "@/shared/lib/crypto/stable/sessionManager";

const AUTH_STORAGE_KEYS = ["auth.token", "auth.refreshToken", "auth.user"];

export async function cleanupAuthData(userId?: string): Promise<void> {
  await AsyncStorage.multiRemove(AUTH_STORAGE_KEYS);
  if (userId) {
    try {
      await StableLibSessionManager.clearLocalCrypto(userId);
    } catch (error) {
      console.warn("[Auth] Failed to clear local crypto on logout", error);
    }
  }
}
