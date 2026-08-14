import AsyncStorage from "@react-native-async-storage/async-storage";
import { StableLibSessionManager } from "@/shared/lib/crypto/stable/sessionManager";
import { disconnectSocket } from "@/shared/lib/realtime/socket";
import { cancelAllNotifications } from "@/shared/lib/notifications";

const AUTH_STORAGE_KEYS = ["auth.token", "auth.refreshToken", "auth.user"];

export async function cleanupAuthData(userId?: string): Promise<void> {
  disconnectSocket();
  void cancelAllNotifications();
  await AsyncStorage.multiRemove(AUTH_STORAGE_KEYS);
  if (userId) {
    try {
      await StableLibSessionManager.clearLocalCrypto(userId);
    } catch (error) {
      console.warn("[Auth] Failed to clear local crypto on logout", error);
    }
  }
}
